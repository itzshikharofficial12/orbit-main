import { createServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type {
  MeetingWithRelations,
  MeetingFilterParams,
  MeetingStats,
} from "./types";
import { env } from "@/lib/env";

async function getMeetingReadClient(): Promise<SupabaseClient<Database>> {
  const admin = getAdminClient();
  if (admin) return admin as unknown as SupabaseClient<Database>;

  try {
    return (await createServerClient()) as unknown as SupabaseClient<Database>;
  } catch {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
  }
}

function isSchemaCacheMissingTable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const msg = "message" in err ? String(err.message) : "";
  const code = "code" in err ? String(err.code) : "";
  return (
    msg.includes("Could not find the table 'public.meetings'") ||
    code === "PGRST204" ||
    code === "42P01"
  );
}

export async function getAdminUpcomingMeetings(): Promise<MeetingWithRelations[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await getMeetingReadClient();
    const { data, error } = await supabase
      .from("meetings")
      .select(`
        *,
        client:clients(id, name, status, primary_contact_name, primary_contact_email),
        project:projects(id, name, status, service_type),
        created_by_profile:profiles(id, first_name, last_name, email)
      `)
      .eq("status", "SCHEDULED")
      .order("starts_at", { ascending: true });

    if (error) {
      if (!isSchemaCacheMissingTable(error)) {
        console.warn("Notice: Error fetching admin upcoming meetings:", error.message || error);
      }
      return [];
    }

    return (data as unknown as MeetingWithRelations[]) || [];
  } catch (err) {
    if (!isSchemaCacheMissingTable(err)) {
      console.warn("Notice: Unexpected error in getAdminUpcomingMeetings:", err);
    }
    return [];
  }
}

export async function getAdminPastMeetings(): Promise<MeetingWithRelations[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await getMeetingReadClient();
    const { data, error } = await supabase
      .from("meetings")
      .select(`
        *,
        client:clients(id, name, status, primary_contact_name, primary_contact_email),
        project:projects(id, name, status, service_type),
        created_by_profile:profiles(id, first_name, last_name, email)
      `)
      .in("status", ["COMPLETED", "CANCELLED"])
      .order("starts_at", { ascending: false });

    if (error) {
      if (!isSchemaCacheMissingTable(error)) {
        console.warn("Notice: Error fetching admin past meetings:", error.message || error);
      }
      return [];
    }

    return (data as unknown as MeetingWithRelations[]) || [];
  } catch (err) {
    if (!isSchemaCacheMissingTable(err)) {
      console.warn("Notice: Unexpected error in getAdminPastMeetings:", err);
    }
    return [];
  }
}

export async function getMeetingsForAdmin(
  filters?: MeetingFilterParams
): Promise<{ upcoming: MeetingWithRelations[]; past: MeetingWithRelations[] }> {
  if (!env.isConfigured()) return { upcoming: [], past: [] };

  const [upcoming, past] = await Promise.all([
    getAdminUpcomingMeetings(),
    getAdminPastMeetings(),
  ]);

  if (filters?.clientId && filters.clientId !== "ALL") {
    return {
      upcoming: upcoming.filter((m) => m.client_id === filters.clientId),
      past: past.filter((m) => m.client_id === filters.clientId),
    };
  }

  return { upcoming, past };
}

export async function getMeetingsForClient(
  clientId: string
): Promise<{ upcoming: MeetingWithRelations[]; past: MeetingWithRelations[] }> {
  if (!env.isConfigured() || !clientId) {
    return { upcoming: [], past: [] };
  }

  try {
    const supabase = await getMeetingReadClient();

    const { data, error } = await supabase
      .from("meetings")
      .select(`
        *,
        project:projects(id, name, status, service_type),
        created_by_profile:profiles(id, first_name, last_name, email)
      `)
      .eq("client_id", clientId)
      .order("starts_at", { ascending: true });

    if (error) {
      if (!isSchemaCacheMissingTable(error)) {
        console.warn("Notice: Error fetching meetings for client:", error.message || error);
      }
      return { upcoming: [], past: [] };
    }

    const all = (data as unknown as MeetingWithRelations[]) || [];

    const upcoming = all
      .filter((m) => m.status === "SCHEDULED")
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    const past = all
      .filter((m) => m.status === "COMPLETED" || m.status === "CANCELLED")
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

    return { upcoming, past };
  } catch (err) {
    if (!isSchemaCacheMissingTable(err)) {
      console.warn("Notice: Unexpected error in getMeetingsForClient:", err);
    }
    return { upcoming: [], past: [] };
  }
}

export async function getUpcomingMeetingForClient(
  clientId: string
): Promise<MeetingWithRelations | null> {
  if (!env.isConfigured() || !clientId) return null;

  try {
    const supabase = await getMeetingReadClient();

    const { data, error } = await supabase
      .from("meetings")
      .select(`
        *,
        project:projects(id, name, status, service_type)
      `)
      .eq("client_id", clientId)
      .eq("status", "SCHEDULED")
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return (data as unknown as MeetingWithRelations) || null;
  } catch {
    return null;
  }
}

export async function getUpcomingMeetingsForAdmin(
  limit: number = 3
): Promise<MeetingWithRelations[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await getMeetingReadClient();

    const { data, error } = await supabase
      .from("meetings")
      .select(`
        *,
        client:clients(id, name, status, primary_contact_name, primary_contact_email),
        project:projects(id, name, status, service_type)
      `)
      .eq("status", "SCHEDULED")
      .order("starts_at", { ascending: true })
      .limit(limit);

    if (error) {
      return [];
    }

    return (data as unknown as MeetingWithRelations[]) || [];
  } catch {
    return [];
  }
}

export async function getMeetingById(
  meetingId: string
): Promise<MeetingWithRelations | null> {
  if (!env.isConfigured()) return null;

  try {
    const supabase = await getMeetingReadClient();
    const { data, error } = await supabase
      .from("meetings")
      .select(`
        *,
        client:clients(id, name, status, primary_contact_name, primary_contact_email),
        project:projects(id, name, status, service_type),
        created_by_profile:profiles(id, first_name, last_name, email)
      `)
      .eq("id", meetingId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return (data as unknown as MeetingWithRelations) || null;
  } catch {
    return null;
  }
}

export async function getMeetingStats(): Promise<MeetingStats> {
  if (!env.isConfigured()) {
    return { total: 0, upcoming: 0, completed: 0, cancelled: 0 };
  }

  try {
    const supabase = await getMeetingReadClient();

    const { data, error } = await supabase
      .from("meetings")
      .select("status, starts_at, ends_at");

    if (error || !data) {
      return { total: 0, upcoming: 0, completed: 0, cancelled: 0 };
    }

    const rows = (data as unknown as { status: string; ends_at: string }[]) || [];
    const total = rows.length;
    const upcoming = rows.filter((m) => m.status === "SCHEDULED").length;
    const completed = rows.filter((m) => m.status === "COMPLETED").length;
    const cancelled = rows.filter((m) => m.status === "CANCELLED").length;

    return { total, upcoming, completed, cancelled };
  } catch {
    return { total: 0, upcoming: 0, completed: 0, cancelled: 0 };
  }
}
