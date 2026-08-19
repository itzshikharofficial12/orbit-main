import { createServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type {
  SendNotificationPayload,
  ClientNotificationTarget,
  AdminNotificationTarget,
  NotificationInsert,
} from "./types";
import { env } from "@/lib/env";

/**
 * Core utility to get the highest privilege client available for server-side notification creation.
 */
async function getNotificationClient(): Promise<SupabaseClient<Database>> {
  const adminClient = getAdminClient();
  if (adminClient) {
    return adminClient;
  }
  return (await createServerClient()) as unknown as SupabaseClient<Database>;
}

interface RawNotificationPayload {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  clientId?: string | null;
  recipientRole?: string | null;
}

/**
 * Send batch notifications with automatic schema adaptation (supports both new recipient_id/is_read and legacy columns).
 */
async function deliverNotificationBatch(
  items: RawNotificationPayload[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!env.isConfigured() || items.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const supabase = await getNotificationClient();

    // 1. Try modern schema (00009_notifications_system.sql)
    const modernRows: NotificationInsert[] = items.map((p) => ({
      recipient_id: p.recipientId,
      type: p.type,
      title: p.title,
      message: p.message,
      link: p.link || null,
      is_read: false,
    }));

    const { error: modernErr } = await supabase
      .from("notifications")
      .insert(modernRows as never);

    if (!modernErr) {
      return { success: true, count: items.length };
    }

    // 2. Fallback if schema has legacy columns (read, recipient_profile_id, recipient_client_id)
    console.log("Notice: Modern notification insert failed, using adaptive legacy schema fallback...");
    const legacyRows = items.map((p) => ({
      recipient_profile_id: p.recipientId,
      recipient_client_id: p.clientId || null,
      recipient_role: p.recipientRole || null,
      type: p.type,
      title: p.title,
      message: p.message,
      link: p.link || null,
      read: false,
    }));

    const { error: legacyErr } = await (supabase as unknown as SupabaseClient)
      .from("notifications")
      .insert(legacyRows as never);

    if (legacyErr) {
      console.warn("Notice: Legacy notification fallback also failed:", legacyErr.message);
      return { success: false, count: 0, error: legacyErr.message };
    }

    return { success: true, count: items.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected notification error";
    console.warn("Notice: Error in deliverNotificationBatch:", msg);
    return { success: false, count: 0, error: msg };
  }
}

/**
 * Send a notification to a specific recipient user.
 */
export async function sendNotification(
  payload: SendNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  const res = await deliverNotificationBatch([
    {
      recipientId: payload.recipientId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link,
    },
  ]);
  return { success: res.success, error: res.error };
}

/**
 * Send batch notifications efficiently.
 */
export async function sendNotificationBatch(
  payloads: SendNotificationPayload[]
): Promise<{ success: boolean; count: number; error?: string }> {
  return await deliverNotificationBatch(
    payloads.map((p) => ({
      recipientId: p.recipientId,
      type: p.type,
      title: p.title,
      message: p.message,
      link: p.link,
    }))
  );
}

/**
 * Resolves all profile accounts associated with a client organization and sends notification to each.
 */
export async function notifyClientUsers(
  target: ClientNotificationTarget
): Promise<{ success: boolean; deliveredTo: number }> {
  if (!env.isConfigured() || !target.clientId) {
    return { success: false, deliveredTo: 0 };
  }

  try {
    const supabase = await getNotificationClient();

    // 1. Resolve all client users belonging to target.clientId
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("client_id", target.clientId)
      .eq("role", "CLIENT");

    const resolvedProfiles = (profiles as { id: string }[]) || [];

    // 2. If no direct client profile was matched, check primary contact email from clients table
    if (resolvedProfiles.length === 0) {
      const { data: clientRecord } = await supabase
        .from("clients")
        .select("primary_contact_email")
        .eq("id", target.clientId)
        .maybeSingle();

      const email = (clientRecord as { primary_contact_email?: string } | null)
        ?.primary_contact_email;

      if (email) {
        const { data: fallbackProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email);

        if (fallbackProfiles && fallbackProfiles.length > 0) {
          (fallbackProfiles as { id: string }[]).forEach((p) => resolvedProfiles.push(p));
        }
      }
    }

    // Even if no specific profile row was resolved yet, dispatch with clientId for legacy selector
    if (resolvedProfiles.length === 0) {
      const res = await deliverNotificationBatch([
        {
          recipientId: target.clientId, // fallback ID
          clientId: target.clientId,
          recipientRole: "CLIENT",
          type: target.type,
          title: target.title,
          message: target.message,
          link: target.link,
        },
      ]);
      return { success: res.success, deliveredTo: res.count };
    }

    const items: RawNotificationPayload[] = resolvedProfiles.map((p) => ({
      recipientId: p.id,
      clientId: target.clientId,
      recipientRole: "CLIENT",
      type: target.type,
      title: target.title,
      message: target.message,
      link: target.link,
    }));

    const result = await deliverNotificationBatch(items);
    return { success: result.success, deliveredTo: result.count };
  } catch (err) {
    console.warn("Notice: Error in notifyClientUsers:", err);
    return { success: false, deliveredTo: 0 };
  }
}

/**
 * Resolves all SUPER_ADMIN accounts and sends notifications to them.
 */
export async function notifySuperAdmins(
  target: AdminNotificationTarget
): Promise<{ success: boolean; deliveredTo: number }> {
  if (!env.isConfigured()) {
    return { success: false, deliveredTo: 0 };
  }

  try {
    const supabase = await getNotificationClient();

    // Resolve all SUPER_ADMIN accounts
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "SUPER_ADMIN");

    let adminList = (admins as { id: string }[]) || [];

    if (target.excludeProfileId && adminList.length > 1) {
      adminList = adminList.filter((a) => a.id !== target.excludeProfileId);
    }

    if (adminList.length === 0) {
      // Fallback role dispatch
      const res = await deliverNotificationBatch([
        {
          recipientId: "00000000-0000-0000-0000-000000000000",
          recipientRole: "SUPER_ADMIN",
          type: target.type,
          title: target.title,
          message: target.message,
          link: target.link,
        },
      ]);
      return { success: res.success, deliveredTo: res.count };
    }

    const items: RawNotificationPayload[] = adminList.map((admin) => ({
      recipientId: admin.id,
      recipientRole: "SUPER_ADMIN",
      type: target.type,
      title: target.title,
      message: target.message,
      link: target.link,
    }));

    const result = await deliverNotificationBatch(items);
    return { success: result.success, deliveredTo: result.count };
  } catch (err) {
    console.warn("Notice: Error in notifySuperAdmins:", err);
    return { success: false, deliveredTo: 0 };
  }
}
