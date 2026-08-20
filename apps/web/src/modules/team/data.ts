import { createServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { Profile, Client } from "@/lib/supabase/types";
import type {
  TeamMember,
  TeamStats,
  EmployeeJobRole,
  EmployeeStatus,
  ClientPmHistoryEntry,
} from "./types";

// Helper to extract PM metadata from client record
export function extractClientPmId(client: {
  project_manager_id?: string | null;
  notes?: string | null;
}): string | null {
  if (client.project_manager_id) return client.project_manager_id;
  if (!client.notes) return null;

  try {
    if (client.notes.startsWith("{") && client.notes.endsWith("}")) {
      const parsed = JSON.parse(client.notes);
      if (parsed.project_manager_id) return parsed.project_manager_id;
    } else {
      const match = client.notes.match(/\[PM:\s*([0-9a-f-]{36})\]/i);
      if (match && match[1]) return match[1];
    }
  } catch {
    // Ignore JSON parse errors
  }
  return null;
}

// Helper to extract clean notes without PM tag
export function extractCleanNotes(notes: string | null): string {
  if (!notes) return "";
  try {
    if (notes.startsWith("{") && notes.endsWith("}")) {
      const parsed = JSON.parse(notes);
      return parsed.notes || "";
    }
    return notes.replace(/\[PM:\s*[0-9a-f-]{36}\]/gi, "").trim();
  } catch {
    return notes;
  }
}

export async function getTeamMembers(filters?: {
  job_role?: string;
  status?: string;
  query?: string;
}): Promise<TeamMember[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await createServerClient();
    const adminClient = getAdminClient();
    const dbClient = (adminClient || supabase) as any;

    // 1. Fetch profiles with role SUPER_ADMIN or EMPLOYEE
    const { data: rawProfiles, error } = await dbClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !rawProfiles) {
      console.error("Error fetching profiles for team:", error?.message);
      return [];
    }

    const profilesData = (rawProfiles as unknown as Profile[]) || [];

    // Also fetch auth users metadata if adminClient is available to get extended metadata
    let authUsersMap: Record<string, any> = {};
    if (adminClient) {
      try {
        const { data: authData } = await adminClient.auth.admin.listUsers();
        if (authData?.users) {
          authData.users.forEach((u) => {
            authUsersMap[u.id] = u.user_metadata || {};
          });
        }
      } catch (authErr) {
        console.warn("Notice fetching auth users metadata:", authErr);
      }
    }

    // 2. Fetch clients to calculate assigned client counts per PM
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name, status, notes");

    const clientList = (clientsData as unknown as Array<{ id: string; name: string; status: string; notes?: string | null }>) || [];
    const pmClientsMap: Record<
      string,
      Array<{ id: string; name: string; status: string }>
    > = {};

    for (const c of clientList) {
      const pmId = extractClientPmId(c as any);
      if (pmId) {
        if (!pmClientsMap[pmId]) pmClientsMap[pmId] = [];
        pmClientsMap[pmId].push({
          id: c.id,
          name: c.name,
          status: c.status,
        });
      }
    }

    // 3. Filter and map team members (SUPER_ADMIN and EMPLOYEE / non-CLIENT with no client_id)
    const members: TeamMember[] = [];

    for (const p of profilesData) {
      const meta = authUsersMap[p.id] || {};
      const isTeam =
        p.role === "SUPER_ADMIN" ||
        p.role === "EMPLOYEE" ||
        meta.role === "EMPLOYEE" ||
        meta.role === "SUPER_ADMIN" ||
        (!p.client_id && p.role !== "CLIENT");

      if (!isTeam) continue;

      const jobRole: EmployeeJobRole =
        (p as any).job_role ||
        meta.job_role ||
        (p.role === "SUPER_ADMIN" ? "PROJECT_MANAGER" : "OTHER");

      const status: EmployeeStatus =
        (p as any).status || meta.status || "ACTIVE";

      const phone = (p as any).phone || meta.phone || null;

      const isProjectManager: boolean = Boolean(
        (p as any).is_project_manager ??
        meta.is_project_manager ??
        (jobRole === "PROJECT_MANAGER")
      );

      const department: string | null =
        (p as any).department ||
        meta.department ||
        (p.role === "SUPER_ADMIN" ? "Admin" : null);

      const bio: string | null = (p as any).bio || meta.bio || null;

      const assignedClients = pmClientsMap[p.id] || [];

      members.push({
        id: p.id,
        email: p.email,
        first_name: p.first_name || meta.first_name || "Team Member",
        last_name: p.last_name || meta.last_name || null,
        role: (meta.role as any) || (p.role as any) || "EMPLOYEE",
        job_role: jobRole,
        department: department,
        bio: bio,
        is_project_manager: isProjectManager,
        status: status,
        phone: phone,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        updated_at: p.updated_at,
        assigned_clients_count: assignedClients.filter(
          (c) => c.status === "ACTIVE"
        ).length,
        assigned_clients: assignedClients,
      });
    }

    // Apply filters
    let filtered = members;

    if (filters?.job_role && filters.job_role !== "ALL") {
      filtered = filtered.filter((m) => m.job_role === filters.job_role);
    }

    if (filters?.status && filters.status !== "ALL") {
      filtered = filtered.filter((m) => m.status === filters.status);
    }

    if (filters?.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      filtered = filtered.filter((m) => {
        const fullName = `${m.first_name} ${m.last_name || ""}`.toLowerCase();
        return fullName.includes(q) || m.email.toLowerCase().includes(q);
      });
    }

    return filtered;
  } catch (err) {
    console.error("Unexpected error in getTeamMembers:", err);
    return [];
  }
}

export async function getActiveProjectManagers(): Promise<TeamMember[]> {
  const members = await getTeamMembers({
    status: "ACTIVE",
  });
  return members.filter((m) => m.is_project_manager === true);
}

export async function getTeamMemberById(id: string): Promise<TeamMember | null> {
  const members = await getTeamMembers();
  return members.find((m) => m.id === id) || null;
}

export async function getClientProjectManager(
  clientId: string
): Promise<TeamMember | null> {
  if (!env.isConfigured() || !clientId) return null;

  try {
    const supabase = await createServerClient();
    const { data: client, error } = await supabase
      .from("clients")
      .select("id, project_manager_id, notes")
      .eq("id", clientId)
      .single();

    if (error || !client) return null;

    const pmId = extractClientPmId(client as any);
    if (!pmId) return null;

    return await getTeamMemberById(pmId);
  } catch (err) {
    console.warn("Notice fetching client PM:", err);
    return null;
  }
}

export async function getTeamStats(): Promise<TeamStats> {
  const members = await getTeamMembers();
  const activeMembers = members.filter((m) => m.status === "ACTIVE");

  return {
    total: members.length,
    active: activeMembers.length,
    project_managers: activeMembers.filter(
      (m) => m.is_project_manager
    ).length,
    developers: activeMembers.filter((m) => m.job_role === "DEVELOPER").length,
    designers: activeMembers.filter((m) => m.job_role === "DESIGNER").length,
    other: activeMembers.filter(
      (m) =>
        !m.is_project_manager &&
        m.job_role !== "DEVELOPER" &&
        m.job_role !== "DESIGNER"
    ).length,
  };
}

export async function getClientPmHistory(
  clientId: string
): Promise<ClientPmHistoryEntry[]> {
  if (!env.isConfigured() || !clientId) return [];

  try {
    const supabase = await createServerClient();
    const adminClient = getAdminClient();
    const dbClient = (adminClient || supabase) as any;

    const { data, error } = await dbClient
      .from("client_pm_history")
      .select(`
        *,
        previous_pm:profiles!client_pm_history_previous_pm_id_fkey(id, first_name, last_name, email),
        new_pm:profiles!client_pm_history_new_pm_id_fkey(id, first_name, last_name, email),
        changed_by:profiles!client_pm_history_changed_by_fkey(id, first_name, last_name)
      `)
      .eq("client_id", clientId)
      .order("changed_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data as unknown as ClientPmHistoryEntry[];
  } catch {
    return [];
  }
}
