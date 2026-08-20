"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, getAuthenticatedProfile } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getRecentNotifications } from "./data";
import type { Notification, NotificationActionResult } from "./types";
import { env } from "@/lib/env";

export async function getNotificationsFeedAction(): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> {
  try {
    const items = await getRecentNotifications(20);
    const unreadCount = items.filter((n) => !n.is_read).length;
    return {
      notifications: items,
      unreadCount,
    };
  } catch {
    return { notifications: [], unreadCount: 0 };
  }
}

export async function markNotificationAsReadAction(
  notificationId: string
): Promise<NotificationActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    // 1. Try modern update (is_read)
    const { error: modernErr } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      } as never)
      .eq("id", notificationId);

    if (!modernErr) {
      revalidatePath("/hq");
      revalidatePath("/client");
      return { success: true };
    }

    // 2. Fallback to legacy column (read)
    const { error: legErr } = await supabase
      .from("notifications")
      .update({
        read: true,
      } as never)
      .eq("id", notificationId);

    if (legErr) {
      console.warn("Notice: Error marking notification read:", legErr.message);
      return { success: false, error: legErr.message };
    }

    revalidatePath("/hq");
    revalidatePath("/client");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark as read";
    return { success: false, error: msg };
  }
}

export async function markAllNotificationsAsReadAction(): Promise<NotificationActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    // 1. Try modern update
    const { error: modernErr } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      } as never)
      .eq("recipient_id", profile.id)
      .eq("is_read", false);

    // 2. Also run legacy update for profile / client_id
    if (profile.role === "SUPER_ADMIN") {
      await supabase
        .from("notifications")
        .update({ read: true } as never)
        .or(`recipient_profile_id.eq.${profile.id},recipient_role.eq.SUPER_ADMIN`);
    } else {
      let orFilter = `recipient_profile_id.eq.${profile.id}`;
      if (profile.client_id) {
        orFilter += `,recipient_client_id.eq.${profile.client_id}`;
      }
      await supabase
        .from("notifications")
        .update({ read: true } as never)
        .or(orFilter);
    }

    revalidatePath("/hq");
    revalidatePath("/client");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark all as read";
    return { success: false, error: msg };
  }
}
