"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, getAuthenticatedProfile } from "@/lib/supabase/server";
import {
  createChangeRequestSchema,
  updateRequestStatusSchema,
  type CreateChangeRequestInput,
} from "./schema";
import type {
  RequestActionResult,
  ClientRequest,
  ClientRequestStatus,
} from "./types";
import type {
  ClientRequestInsert,
  ClientRequestUpdate,
  Deliverable,
  DeliverableUpdate,
} from "@/lib/supabase/types";
import { notifySuperAdmins, notifyClientUsers } from "@/modules/notifications/service";
import { env } from "@/lib/env";

export async function createChangeRequestAction(
  input: CreateChangeRequestInput
): Promise<RequestActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  // 1. Authenticate the caller
  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return {
      success: false,
      error: "Unauthorized. Please sign in to submit a request.",
    };
  }

  // 2. Validate inputs
  const validation = createChangeRequestSchema.safeParse(input);
  if (!validation.success) {
    const fieldErrors: Record<string, string[]> = {};
    validation.error.errors.forEach((err) => {
      const field = err.path.join(".");
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(err.message);
    });

    return {
      success: false,
      error: validation.error.errors[0]?.message || "Validation failed",
      fieldErrors,
    };
  }

  const { projectId, deliverableId, title, description, priority } = validation.data;

  try {
    const supabase = await createServerClient();

    // 3. Fetch project and verify ownership if CLIENT
    const { data: rawProject, error: projErr } = await supabase
      .from("projects")
      .select("id, name, client_id, client:clients(name)")
      .eq("id", projectId)
      .maybeSingle();

    if (projErr || !rawProject) {
      return {
        success: false,
        error: "Project not found or you do not have access to it.",
      };
    }

    const project = rawProject as {
      id: string;
      name: string;
      client_id: string | null;
      client?: { name?: string } | null;
    };

    if (!project.client_id) {
      return {
        success: false,
        error: "This project is not linked to a client organization.",
      };
    }

    if (profile.role === "CLIENT") {
      if (!profile.client_id || project.client_id !== profile.client_id) {
        return {
          success: false,
          error: "You do not have access to request changes for this project.",
        };
      }
    }

    // 4. Fetch deliverable and verify it belongs to project and is in READY_FOR_REVIEW status
    const { data: rawDeliverable, error: delivErr } = await supabase
      .from("deliverables")
      .select("*")
      .eq("id", deliverableId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (delivErr || !rawDeliverable) {
      return {
        success: false,
        error: "Deliverable not found or you do not have access to it.",
      };
    }

    const deliverable = rawDeliverable as Deliverable;

    if (deliverable.status === "APPROVED") {
      return {
        success: false,
        error: "This deliverable has already been approved and cannot receive revision requests.",
      };
    }

    if (deliverable.status !== "READY_FOR_REVIEW") {
      return {
        success: false,
        error: `Change requests can only be submitted for deliverables ready for review (current status: ${deliverable.status}).`,
      };
    }

    // 5. Insert the new Change Request record
    const requestPayload: ClientRequestInsert = {
      client_id: project.client_id,
      project_id: projectId,
      deliverable_id: deliverableId,
      title,
      description,
      status: "OPEN",
      priority,
      created_by: profile.id,
    };

    const { data: newRequest, error: reqInsertErr } = await supabase
      .from("client_requests")
      .insert(requestPayload as never)
      .select()
      .maybeSingle();

    if (reqInsertErr || !newRequest) {
      console.error("Error creating client request:", reqInsertErr);
      const isMissingTable =
        reqInsertErr?.message?.includes("Could not find the table 'public.client_requests'") ||
        reqInsertErr?.code === "PGRST204" ||
        reqInsertErr?.code === "42P01";

      return {
        success: false,
        error: isMissingTable
          ? "Database migration required: Please run 00008_client_requests_schema.sql in your Supabase SQL Editor."
          : reqInsertErr?.message || "Failed to create change request.",
      };
    }

    const createdRequest = newRequest as ClientRequest;

    // 6. Transition Deliverable to CHANGES_REQUESTED
    const deliverableUpdatePayload: DeliverableUpdate = {
      status: "CHANGES_REQUESTED",
      changes_requested_at: new Date().toISOString(),
      changes_requested_by: profile.id,
      client_feedback: `${title}: ${description}`,
      updated_at: new Date().toISOString(),
    };

    const { error: delivUpdateErr } = await supabase
      .from("deliverables")
      .update(deliverableUpdatePayload as never)
      .eq("id", deliverableId)
      .eq("project_id", projectId);

    if (delivUpdateErr) {
      console.warn("Warning updating deliverable status after request:", delivUpdateErr);
    }

    // 7. Dispatch notification to Super Admin
    const clientName = project.client?.name || "Client";
    await notifySuperAdmins({
      type: "CHANGES_REQUESTED",
      title: "Changes requested",
      message: `${clientName} requested changes on "${deliverable.title}": ${title}`,
      link: `/hq/requests/${createdRequest.id}`,
    });

    // 8. Revalidate paths
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/hq/requests`);
    revalidatePath(`/hq/requests/${createdRequest.id}`);
    revalidatePath(`/client`);

    return {
      success: true,
      request: createdRequest,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    console.error("Unexpected error in createChangeRequestAction:", err);
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateRequestStatusAction(
  requestId: string,
  newStatus: ClientRequestStatus
): Promise<RequestActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  // 1. Authorize: Only Super Admin can mutate change request statuses
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "SUPER_ADMIN") {
    return {
      success: false,
      error: "Unauthorized. Only Super Admin can update request status.",
    };
  }

  const validation = updateRequestStatusSchema.safeParse({
    requestId,
    status: newStatus,
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Invalid status update parameters.",
    };
  }

  try {
    const supabase = await createServerClient();

    // 2. Fetch existing request with relations
    const { data: rawExisting, error: fetchErr } = await supabase
      .from("client_requests")
      .select("*, project:projects(id, name), deliverable:deliverables(id, title)")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr || !rawExisting) {
      return {
        success: false,
        error: "Change request not found.",
      };
    }

    const existing = rawExisting as ClientRequest & {
      project?: { id: string; name: string };
      deliverable?: { id: string; title: string };
    };

    // 3. Prepare payload with resolution timestamps if RESOLVED
    const isResolving = newStatus === "RESOLVED";
    const payload: ClientRequestUpdate = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      resolved_at: isResolving ? new Date().toISOString() : null,
      resolved_by: isResolving ? profile.id : null,
    };

    const { data, error } = await supabase
      .from("client_requests")
      .update(payload as never)
      .eq("id", requestId)
      .select()
      .maybeSingle();

    if (error || !data) {
      console.error("Error updating change request status:", error);
      return {
        success: false,
        error: error?.message || "Failed to update change request status.",
      };
    }

    const updated = data as ClientRequest;

    // 4. Notify client if marked RESOLVED
    if (isResolving && existing.client_id) {
      const deliverableTitle = existing.deliverable?.title || "deliverable";
      await notifyClientUsers({
        clientId: existing.client_id,
        type: "REQUEST_RESOLVED",
        title: "Change request resolved",
        message: `Your requested changes for "${deliverableTitle}" have been resolved.`,
        link: `/client/projects/${existing.project_id}`,
      });
    }

    // 5. Revalidate paths
    revalidatePath("/hq/requests");
    revalidatePath(`/hq/requests/${requestId}`);
    revalidatePath(`/hq/projects/${existing.project_id}`);
    revalidatePath(`/client/projects/${existing.project_id}`);
    revalidatePath("/client");

    return {
      success: true,
      request: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    console.error("Unexpected error in updateRequestStatusAction:", err);
    return {
      success: false,
      error: message,
    };
  }
}
