"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, getAuthenticatedProfile } from "@/lib/supabase/server";
import {
  createDeliverableSchema,
  updateDeliverableSchema,
  submitDeliverableSchema,
  requestChangesSchema,
} from "./schema";
import type { DeliverableActionResult, Deliverable, DeliverableStatus } from "./types";
import type { DeliverableInsert, DeliverableUpdate } from "@/lib/supabase/types";
import { notifyClientUsers, notifySuperAdmins } from "@/modules/notifications/service";
import { env } from "@/lib/env";

export async function createDeliverableAction(
  projectId: string,
  formData: FormData
): Promise<DeliverableActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "SUPER_ADMIN") {
    return {
      success: false,
      error: "Unauthorized. Super Admin access required.",
    };
  }

  const raw = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    milestone_id: (formData.get("milestone_id") as string) || null,
    status: (formData.get("status") as string) || "PLANNED",
    expected_delivery_date: (formData.get("expected_delivery_date") as string) || null,
    url: (formData.get("url") as string) || null,
    client_visible: formData.get("client_visible") === "true",
    notes: (formData.get("notes") as string) || null,
  };

  const validation = createDeliverableSchema.safeParse(raw);
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

  try {
    const supabase = await createServerClient();

    // Determine position
    const { count } = await supabase
      .from("deliverables")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    const position = count ?? 0;

    const payload: DeliverableInsert = {
      project_id: projectId,
      title: validation.data.title,
      description: validation.data.description,
      milestone_id: validation.data.milestone_id,
      status: validation.data.status,
      expected_delivery_date: validation.data.expected_delivery_date,
      url: validation.data.url,
      client_visible: validation.data.client_visible,
      notes: validation.data.notes,
      position,
      submission_count: 0,
    };

    const { data, error } = await supabase
      .from("deliverables")
      .insert(payload as never)
      .select()
      .maybeSingle();

    if (error || !data) {
      console.error("Error creating deliverable:", error);
      return {
        success: false,
        error: error?.message || "Failed to create deliverable",
      };
    }

    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath("/hq/projects");
    revalidatePath("/client");

    return {
      success: true,
      deliverable: data as Deliverable,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateDeliverableAction(
  deliverableId: string,
  projectId: string,
  formData: FormData
): Promise<DeliverableActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "SUPER_ADMIN") {
    return {
      success: false,
      error: "Unauthorized. Super Admin access required.",
    };
  }

  const raw = {
    id: deliverableId,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    milestone_id: (formData.get("milestone_id") as string) || null,
    status: (formData.get("status") as string) || "PLANNED",
    expected_delivery_date: (formData.get("expected_delivery_date") as string) || null,
    url: (formData.get("url") as string) || null,
    client_visible: formData.get("client_visible") === "true",
    notes: (formData.get("notes") as string) || null,
  };

  const validation = updateDeliverableSchema.safeParse(raw);
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

  try {
    const supabase = await createServerClient();

    const payload: DeliverableUpdate = {
      title: validation.data.title,
      description: validation.data.description,
      milestone_id: validation.data.milestone_id,
      status: validation.data.status,
      expected_delivery_date: validation.data.expected_delivery_date,
      url: validation.data.url,
      client_visible: validation.data.client_visible,
      notes: validation.data.notes,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("deliverables")
      .update(payload as never)
      .eq("id", deliverableId)
      .eq("project_id", projectId)
      .select()
      .maybeSingle();

    if (error || !data) {
      console.error("Error updating deliverable:", error);
      return {
        success: false,
        error: error?.message || "Failed to update deliverable",
      };
    }

    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath("/hq/projects");
    revalidatePath("/client");

    return {
      success: true,
      deliverable: data as Deliverable,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function submitDeliverableForReviewAction(
  deliverableId: string,
  projectId: string,
  formData: FormData
): Promise<DeliverableActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "SUPER_ADMIN") {
    return {
      success: false,
      error: "Unauthorized. Super Admin access required.",
    };
  }

  const raw = {
    id: deliverableId,
    url: (formData.get("url") as string) || "",
    expected_delivery_date: (formData.get("expected_delivery_date") as string) || null,
  };

  const validation = submitDeliverableSchema.safeParse(raw);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "A valid URL is required to submit for review.",
    };
  }

  try {
    const supabase = await createServerClient();

    // 1. Fetch current deliverable and project
    const { data: rawDeliverable, error: fetchErr } = await supabase
      .from("deliverables")
      .select("*, project:projects(id, name, client_id)")
      .eq("id", deliverableId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (fetchErr || !rawDeliverable) {
      return {
        success: false,
        error: "Deliverable not found.",
      };
    }

    const currentDeliverable = rawDeliverable as Deliverable & {
      project?: { id: string; name: string; client_id: string | null };
    };

    const currentCount = currentDeliverable.submission_count ?? 0;
    const newCount = currentCount + 1;

    const payload: DeliverableUpdate = {
      status: "READY_FOR_REVIEW",
      url: validation.data.url,
      client_visible: true,
      submitted_at: new Date().toISOString(),
      submission_count: newCount,
      ...(validation.data.expected_delivery_date
        ? { expected_delivery_date: validation.data.expected_delivery_date }
        : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("deliverables")
      .update(payload as never)
      .eq("id", deliverableId)
      .eq("project_id", projectId)
      .select()
      .maybeSingle();

    if (error || !data) {
      console.error("Error submitting deliverable for review:", error);
      return {
        success: false,
        error: error?.message || "Failed to submit deliverable.",
      };
    }

    // 2. Create notification for Client if client_id exists
    const projectClientId = currentDeliverable.project?.client_id;
    if (projectClientId) {
      await notifyClientUsers({
        clientId: projectClientId,
        type: "DELIVERABLE_SUBMITTED",
        title: "Deliverable ready for review",
        message: `"${currentDeliverable.title}" has been submitted for your review.`,
        link: `/client/projects/${projectId}`,
      });
    }

    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath("/hq/projects");
    revalidatePath("/client");

    return {
      success: true,
      deliverable: data as Deliverable,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function continueWorkDeliverableAction(
  deliverableId: string,
  projectId: string
): Promise<DeliverableActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "SUPER_ADMIN") {
    return {
      success: false,
      error: "Unauthorized. Super Admin access required.",
    };
  }

  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("deliverables")
      .update({
        status: "IN_PROGRESS",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", deliverableId)
      .eq("project_id", projectId)
      .select()
      .maybeSingle();

    if (error || !data) {
      console.error("Error continuing work on deliverable:", error);
      return {
        success: false,
        error: error?.message || "Failed to update status to In Progress.",
      };
    }

    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath("/hq/projects");
    revalidatePath("/client");

    return {
      success: true,
      deliverable: data as Deliverable,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function approveDeliverableAction(
  deliverableId: string,
  projectId: string
): Promise<DeliverableActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  // 1. Authenticate the current user
  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return {
      success: false,
      error: "Unauthorized. Please sign in.",
    };
  }

  try {
    const supabase = await createServerClient();

    // 2. Fetch project and verify ownership if CLIENT
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

    if (profile.role === "CLIENT") {
      if (!profile.client_id || project.client_id !== profile.client_id) {
        return {
          success: false,
          error: "You do not have access to approve deliverables for this project.",
        };
      }
    }

    // 3. Fetch deliverable and verify current status is READY_FOR_REVIEW
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

    const currentDeliverable = rawDeliverable as Deliverable;

    if (currentDeliverable.status === "APPROVED") {
      return {
        success: false,
        error: "This deliverable has already been approved.",
      };
    }

    if (currentDeliverable.status !== "READY_FOR_REVIEW") {
      return {
        success: false,
        error: `This deliverable is not currently awaiting review (current status: ${currentDeliverable.status}).`,
      };
    }

    // 4. Perform atomic update matching state = READY_FOR_REVIEW
    const payload: DeliverableUpdate = {
      status: "APPROVED",
      approved_at: new Date().toISOString(),
      approved_by: profile.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("deliverables")
      .update(payload as never)
      .eq("id", deliverableId)
      .eq("project_id", projectId)
      .eq("status", "READY_FOR_REVIEW")
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error approving deliverable in database:", error);
      return {
        success: false,
        error: "Unable to approve deliverable: " + (error.message || "Database update failed."),
      };
    }

    if (!data) {
      // Check if status changed concurrently
      const { data: rawLatest } = await supabase
        .from("deliverables")
        .select("status")
        .eq("id", deliverableId)
        .maybeSingle();

      const latest = rawLatest as { status?: DeliverableStatus } | null;

      if (latest && latest.status !== "READY_FOR_REVIEW") {
        if (latest.status === "APPROVED") {
          return {
            success: false,
            error: "This deliverable has already been approved.",
          };
        }
        return {
          success: false,
          error: `This deliverable is no longer awaiting approval (current status: ${latest.status}).`,
        };
      }

      // If status is still READY_FOR_REVIEW but update affected 0 rows, RLS policy is blocking client UPDATE
      return {
        success: false,
        error: "Database permission error: Please ensure the 'deliverables_client_update' RLS policy is executed in Supabase.",
      };
    }

    // 5. Create notification for Super Admin
    const clientName = project.client?.name || "Client";
    await notifySuperAdmins({
      type: "DELIVERABLE_APPROVED",
      title: "Deliverable approved",
      message: `${clientName} approved "${currentDeliverable.title}".`,
      link: `/hq/projects/${projectId}?tab=deliverables`,
    });

    // 6. Revalidate pages
    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath("/hq/projects");
    revalidatePath("/client");

    return {
      success: true,
      deliverable: data as Deliverable,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    console.error("Unexpected error in approveDeliverableAction:", err);
    return {
      success: false,
      error: "Unable to approve this deliverable. Please try again.",
    };
  }
}

export async function requestDeliverableChangesAction(
  deliverableId: string,
  projectId: string,
  feedback: string
): Promise<DeliverableActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  // 1. Authenticate current user
  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return {
      success: false,
      error: "Unauthorized. Please sign in.",
    };
  }

  const validation = requestChangesSchema.safeParse({ id: deliverableId, feedback });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Please provide specific feedback details.",
    };
  }

  try {
    const supabase = await createServerClient();

    // 2. Fetch project and verify ownership if CLIENT
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

    if (profile.role === "CLIENT") {
      if (!profile.client_id || project.client_id !== profile.client_id) {
        return {
          success: false,
          error: "You do not have access to request changes for this project.",
        };
      }
    }

    // 3. Fetch deliverable and verify current status is READY_FOR_REVIEW
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

    const currentDeliverable = rawDeliverable as Deliverable;

    if (currentDeliverable.status === "APPROVED") {
      return {
        success: false,
        error: "This deliverable has already been approved.",
      };
    }

    if (currentDeliverable.status !== "READY_FOR_REVIEW") {
      return {
        success: false,
        error: `This deliverable is not currently awaiting review (current status: ${currentDeliverable.status}).`,
      };
    }

    // 4. Perform atomic update matching status = READY_FOR_REVIEW
    const payload: DeliverableUpdate = {
      status: "CHANGES_REQUESTED",
      changes_requested_at: new Date().toISOString(),
      changes_requested_by: profile.id,
      client_feedback: validation.data.feedback,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("deliverables")
      .update(payload as never)
      .eq("id", deliverableId)
      .eq("project_id", projectId)
      .eq("status", "READY_FOR_REVIEW")
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error requesting changes on deliverable in database:", error);
      return {
        success: false,
        error: "Unable to submit change request: " + (error.message || "Database update failed."),
      };
    }

    if (!data) {
      // Check if status changed concurrently
      const { data: rawLatest } = await supabase
        .from("deliverables")
        .select("status")
        .eq("id", deliverableId)
        .maybeSingle();

      const latest = rawLatest as { status?: DeliverableStatus } | null;

      if (latest && latest.status !== "READY_FOR_REVIEW") {
        if (latest.status === "APPROVED") {
          return {
            success: false,
            error: "This deliverable has already been approved.",
          };
        }
        return {
          success: false,
          error: `This deliverable is no longer awaiting review (current status: ${latest.status}).`,
        };
      }

      return {
        success: false,
        error: "Database permission error: Please ensure the 'deliverables_client_update' RLS policy is executed in Supabase.",
      };
    }

    // 5. Insert client_requests record if project has client_id
    let newRequestId: string | null = null;
    if (project.client_id) {
      try {
        const { data: insertedRequest } = await supabase
          .from("client_requests")
          .insert({
            client_id: project.client_id,
            project_id: projectId,
            deliverable_id: deliverableId,
            title: `Revisions for ${currentDeliverable.title}`,
            description: validation.data.feedback,
            status: "OPEN",
            priority: "MEDIUM",
            created_by: profile.id,
          } as never)
          .select("id")
          .maybeSingle();

        if (insertedRequest) {
          newRequestId = (insertedRequest as { id: string }).id;
        }
      } catch (reqErr) {
        console.warn("Failed to insert client_requests record:", reqErr);
      }
    }

    // 6. Create notification for Super Admin
    const clientName = project.client?.name || "Client";
    await notifySuperAdmins({
      type: "CHANGES_REQUESTED",
      title: "Changes requested",
      message: `${clientName} requested changes on "${currentDeliverable.title}".`,
      link: newRequestId
        ? `/hq/requests/${newRequestId}`
        : `/hq/projects/${projectId}?tab=deliverables`,
    });

    // 7. Revalidate pages
    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath("/hq/requests");
    if (newRequestId) {
      revalidatePath(`/hq/requests/${newRequestId}`);
    }
    revalidatePath("/hq/projects");
    revalidatePath("/client");

    return {
      success: true,
      deliverable: data as Deliverable,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    console.error("Unexpected error in requestDeliverableChangesAction:", err);
    return {
      success: false,
      error: "Unable to submit change request. Please try again.",
    };
  }
}

export async function deleteDeliverableAction(
  deliverableId: string,
  projectId: string
): Promise<DeliverableActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "SUPER_ADMIN") {
    return {
      success: false,
      error: "Unauthorized. Super Admin access required.",
    };
  }

  try {
    const supabase = await createServerClient();

    const { error } = await supabase
      .from("deliverables")
      .delete()
      .eq("id", deliverableId)
      .eq("project_id", projectId);

    if (error) {
      console.error("Error deleting deliverable:", error);
      return {
        success: false,
        error: error.message || "Failed to delete deliverable",
      };
    }

    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath("/hq/projects");
    revalidatePath("/client");

    return {
      success: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}
