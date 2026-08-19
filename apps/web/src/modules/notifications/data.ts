import { createServerClient, getAuthenticatedProfile } from "@/lib/supabase/server";
import type { Notification } from "./types";
import { env } from "@/lib/env";

interface RawNotificationRow {
  id: string;
  recipient_id?: string;
  recipient_profile_id?: string;
  recipient_client_id?: string;
  recipient_role?: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read?: boolean;
  read?: boolean;
  created_at: string;
  updated_at?: string;
}

export async function getRecentNotifications(
  limit: number = 20
): Promise<Notification[]> {
  if (!env.isConfigured()) return [];

  const profile = await getAuthenticatedProfile();
  if (!profile) return [];

  try {
    const supabase = await createServerClient();

    // Query both modern recipient_id and legacy columns
    let filterQuery = `recipient_id.eq.${profile.id},recipient_profile_id.eq.${profile.id}`;
    if (profile.client_id) {
      filterQuery += `,recipient_client_id.eq.${profile.client_id}`;
    }
    if (profile.role === "SUPER_ADMIN") {
      filterQuery += `,recipient_role.eq.SUPER_ADMIN`;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(filterQuery)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      // Fallback simple query
      const fallback = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (fallback.data) {
        return (fallback.data as unknown as RawNotificationRow[]).map((r) => ({
          id: r.id,
          recipient_id: r.recipient_id || r.recipient_profile_id || profile.id,
          type: r.type,
          title: r.title,
          message: r.message,
          link: r.link,
          is_read: r.is_read !== undefined ? Boolean(r.is_read) : Boolean(r.read),
          created_at: r.created_at,
          updated_at: r.updated_at || r.created_at,
        }));
      }

      return [];
    }

    const rows = (data as unknown as RawNotificationRow[]) || [];
    return rows.map((r) => ({
      id: r.id,
      recipient_id: r.recipient_id || r.recipient_profile_id || profile.id,
      type: r.type,
      title: r.title,
      message: r.message,
      link: r.link,
      is_read: r.is_read !== undefined ? Boolean(r.is_read) : Boolean(r.read),
      created_at: r.created_at,
      updated_at: r.updated_at || r.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  const items = await getRecentNotifications(50);
  return items.filter((item) => !item.is_read).length;
}
