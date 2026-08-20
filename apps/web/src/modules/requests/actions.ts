"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, getAuthenticatedProfile } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  createClientRequestSchema,
  createChangeRequestSchema,
  sendRequestMessageSchema,
  updateRequestStatusSchema,
  updateRequestPrioritySchema,
  type CreateClientRequestInput,
  type CreateChangeRequestInput,
  type SendRequestMessageInput,
  type UpdateRequestStatusInput,
  type UpdateRequestPriorityInput,
} from "./schema";
import type {
  RequestActionResult,
  ClientRequest,
  RequestStatus,
  RequestMessage,
} from "./types";
import { notifySuperAdmins, notifyClientUsers } from "@/modules/notifications/service";
import { env } from "@/lib/env";

/**
 * Universal Action: Create a client request across any category.
 */
export async function createClientRequestAction(
  input: CreateClientRequestInput
): Promise<RequestActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const validation = createClientRequestSchema.safeParse(input);
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

  const {
    title,
    description,
    category,
    priority,
    projectId,
    deliverableId,
    paymentId,
    meetingId,
    scheduleItemId,
  } = validation.data;

  // Resolve clientId
  let clientId = profile.client_id;
  if (!clientId && profile.role === "CLIENT") {
    return { success: false, error: "Your account is not linked to a client organization." };
  }

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    // If projectId provided, verify client access
    let projectName = "";
    if (projectId) {
      const { data: rawProject } = await supabase
        .from("projects")
        .select("id, name, client_id")
        .eq("id", projectId)
        .maybeSingle();

      if (rawProject) {
        projectName = (rawProject as { name: string }).name;
        if (!clientId && (rawProject as { client_id: string | null }).client_id) {
          clientId = (rawProject as { client_id: string }).client_id;
        }
      }
    }

    if (!clientId) {
      // Fallback: lookup client from client_id
      const { data: firstClient } = await supabase.from("clients").select("id, name").limit(1).maybeSingle();
      if (firstClient) {
        clientId = (firstClient as { id: string }).id;
      }
    }

    if (!clientId) {
      return { success: false, error: "Unable to associate request with client organization." };
    }

    // Insert request
    const insertPayload = {
      client_id: clientId,
      created_by: profile.id,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status: "OPEN" as const,
      project_id: projectId || null,
      deliverable_id: deliverableId || null,
      payment_id: paymentId || null,
      meeting_id: meetingId || null,
      schedule_item_id: scheduleItemId || null,
    };

    const { data: createdRequest, error: insErr } = await supabase
      .from("client_requests")
      .insert(insertPayload as never)
      .select()
      .single();

    if (insErr || !createdRequest) {
      console.warn("Error creating client request:", insErr?.message || insErr);
      return { success: false, error: insErr?.message || "Failed to create request." };
    }

    const req = createdRequest as unknown as ClientRequest;
    const refTag = req.reference_number || "REQ";

    // Notify Super Admins with high visibility
    const clientName = profile.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : profile.email;
    await notifySuperAdmins({
      type: "REQUEST_CREATED",
      title: `New client request: ${title}`,
      message: `[${refTag}] ${clientName} submitted a ${category} request:\n"${description.trim().slice(0, 140)}..."`,
      link: `/hq/requests/${req.id}`,
    });

    revalidatePath("/client/requests");
    revalidatePath("/client");
    revalidatePath("/hq/requests");
    revalidatePath("/hq");

    return {
      success: true,
      request: req,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}

/**
 * Backwards-compatibility wrapper for deliverable change requests.
 */
export async function createChangeRequestAction(
  input: CreateChangeRequestInput
): Promise<RequestActionResult> {
  return createClientRequestAction({
    title: input.title,
    description: input.description,
    category: input.deliverableId ? "DELIVERABLE" : "PROJECT",
    priority: input.priority || "MEDIUM",
    projectId: input.projectId || null,
    deliverableId: input.deliverableId || null,
  });
}

/**
 * Threaded Conversation Action: Send a message in a request.
 */
export async function sendRequestMessageAction(
  input: SendRequestMessageInput
): Promise<RequestActionResult<RequestMessage>> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const validation = sendRequestMessageSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Invalid message",
    };
  }

  const { requestId, message } = validation.data;

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    // 1. Verify request access
    const { data: rawReq, error: reqErr } = await supabase
      .from("client_requests")
      .select("id, reference_number, title, client_id, status, created_by")
      .eq("id", requestId)
      .maybeSingle();

    if (reqErr || !rawReq) {
      return { success: false, error: "Request not found or access denied." };
    }

    const req = rawReq as {
      id: string;
      reference_number: string | null;
      title: string;
      client_id: string;
      status: RequestStatus;
      created_by: string;
    };

    if (profile.role === "CLIENT" && profile.client_id !== req.client_id) {
      return { success: false, error: "Unauthorized access to this request." };
    }

    // 2. Insert message into request_messages
    const { data: newMsg, error: msgErr } = await supabase
      .from("request_messages")
      .insert({
        request_id: requestId,
        sender_id: profile.id,
        message: message.trim(),
        is_internal: false,
      } as never)
      .select(`
        *,
        sender:profiles!request_messages_sender_id_fkey(id, first_name, last_name, email, role)
      `)
      .single();

    if (msgErr || !newMsg) {
      console.warn("Error inserting request message:", msgErr?.message || msgErr);
      return { success: false, error: msgErr?.message || "Failed to send message." };
    }

    // 3. Update request updated_at timestamp & auto-transition status if appropriate
    let nextStatus = req.status;
    if (profile.role === "SUPER_ADMIN" && req.status === "OPEN") {
      nextStatus = "IN_PROGRESS";
    }

    await supabase
      .from("client_requests")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", requestId);

    const refTag = req.reference_number || "REQ";
    const senderName = profile.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : profile.email;

    // 4. Send Notifications
    if (profile.role === "CLIENT") {
      // Client replied -> Notify Super Admins
      await notifySuperAdmins({
        type: "REQUEST_REPLY",
        title: `Reply on ${refTag}: ${req.title}`,
        message: `${senderName} replied:\n"${message.trim().slice(0, 140)}..."`,
        link: `/hq/requests/${requestId}`,
      });
    } else {
      // Admin replied -> Notify Client Users
      await notifyClientUsers({
        clientId: req.client_id,
        type: "REQUEST_RESPONSE",
        title: `Response received on ${refTag}`,
        message: `Celestia Studios responded to "${req.title}":\n"${message.trim().slice(0, 140)}..."`,
        link: `/client/requests/${requestId}`,
      });
    }

    revalidatePath(`/client/requests/${requestId}`);
    revalidatePath(`/hq/requests/${requestId}`);
    revalidatePath("/client/requests");
    revalidatePath("/hq/requests");

    return {
      success: true,
      data: newMsg as unknown as RequestMessage,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}

/**
 * Action: Update request status and notify parties.
 */
export async function updateRequestStatusAction(
  input: UpdateRequestStatusInput
): Promise<RequestActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const validation = updateRequestStatusSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Invalid status",
    };
  }

  const { requestId, status, resolutionNotes } = validation.data;

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    const { data: rawReq, error: fetchErr } = await supabase
      .from("client_requests")
      .select("id, reference_number, title, client_id, status")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr || !rawReq) {
      return { success: false, error: "Request not found." };
    }

    const req = rawReq as {
      id: string;
      reference_number: string | null;
      title: string;
      client_id: string;
      status: RequestStatus;
    };

    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "RESOLVED" || status === "CLOSED") {
      updatePayload.resolved_at = new Date().toISOString();
      updatePayload.resolved_by = profile.id;
    } else {
      updatePayload.resolved_at = null;
      updatePayload.resolved_by = null;
    }

    const { data: updatedReq, error: updateErr } = await supabase
      .from("client_requests")
      .update(updatePayload as never)
      .eq("id", requestId)
      .select()
      .single();

    if (updateErr) {
      console.warn("Error updating request status:", updateErr.message);
      return { success: false, error: updateErr.message };
    }

    // Optional: add resolution notes message if provided
    if (resolutionNotes?.trim()) {
      await supabase.from("request_messages").insert({
        request_id: requestId,
        sender_id: profile.id,
        message: `[Status changed to ${status.replace(/_/g, " ")}]: ${resolutionNotes.trim()}`,
        is_internal: false,
      } as never);
    }

    const refTag = req.reference_number || "REQ";

    // Notify client of status change
    let notifTitle = `Request ${refTag} updated`;
    let notifMsg = `Your request "${req.title}" is now ${status.replace(/_/g, " ")}.`;

    if (status === "WAITING_FOR_CLIENT") {
      notifTitle = `Action required on ${refTag}`;
      notifMsg = `Celestia Studios has requested information on "${req.title}".`;
    } else if (status === "RESOLVED") {
      notifTitle = `Your request ${refTag} has been resolved`;
      notifMsg = `"${req.title}" has been marked as resolved by Celestia Studios.`;
    }

    await notifyClientUsers({
      clientId: req.client_id,
      type: status === "WAITING_FOR_CLIENT" ? "ACTION_REQUIRED" : "REQUEST_STATUS_CHANGED",
      title: notifTitle,
      message: notifMsg,
      link: `/client/requests/${requestId}`,
    });

    revalidatePath(`/client/requests/${requestId}`);
    revalidatePath(`/hq/requests/${requestId}`);
    revalidatePath("/client/requests");
    revalidatePath("/hq/requests");

    return {
      success: true,
      request: updatedReq as unknown as ClientRequest,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}

/**
 * Action: Client reopens a resolved request.
 */
export async function reopenRequestAction(requestId: string): Promise<RequestActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    const { data: rawReq, error: fetchErr } = await supabase
      .from("client_requests")
      .select("id, reference_number, title, client_id, status")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr || !rawReq) {
      return { success: false, error: "Request not found." };
    }

    const req = rawReq as {
      id: string;
      reference_number: string | null;
      title: string;
      client_id: string;
      status: RequestStatus;
    };

    if (profile.role === "CLIENT" && profile.client_id !== req.client_id) {
      return { success: false, error: "Unauthorized access." };
    }

    // Move status back to OPEN
    const { data: updatedReq, error: updateErr } = await supabase
      .from("client_requests")
      .update({
        status: "OPEN",
        resolved_at: null,
        resolved_by: null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", requestId)
      .select()
      .single();

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // Add automated reopen note to conversation thread
    const senderName = profile.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : profile.email;
    await supabase.from("request_messages").insert({
      request_id: requestId,
      sender_id: profile.id,
      message: `[Request Reopened by ${senderName}]`,
      is_internal: false,
    } as never);

    const refTag = req.reference_number || "REQ";

    // Notify Super Admins
    await notifySuperAdmins({
      type: "REQUEST_REOPENED",
      title: `Request Reopened: ${refTag}`,
      message: `${senderName} reopened request "${req.title}".`,
      link: `/hq/requests/${requestId}`,
    });

    revalidatePath(`/client/requests/${requestId}`);
    revalidatePath(`/hq/requests/${requestId}`);
    revalidatePath("/client/requests");
    revalidatePath("/hq/requests");

    return {
      success: true,
      request: updatedReq as unknown as ClientRequest,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}

/**
 * Action: Update request priority (Admin).
 */
export async function updateRequestPriorityAction(
  input: UpdateRequestPriorityInput
): Promise<RequestActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const validation = updateRequestPrioritySchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: "Invalid priority value" };
  }

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    const { data: updatedReq, error } = await supabase
      .from("client_requests")
      .update({
        priority: validation.data.priority,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", validation.data.requestId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/client/requests/${validation.data.requestId}`);
    revalidatePath(`/hq/requests/${validation.data.requestId}`);
    revalidatePath("/client/requests");
    revalidatePath("/hq/requests");

    return {
      success: true,
      request: updatedReq as unknown as ClientRequest,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}
