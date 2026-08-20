import { createServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Client, ClientWithPm, ClientFilters, ClientStats, ClientStatus } from "./types";
import type { Profile } from "@/lib/supabase/types";
import { env } from "@/lib/env";
import { extractClientPmId, extractCleanNotes, getTeamMembers } from "@/modules/team/data";

export async function getClients(filters?: ClientFilters): Promise<ClientWithPm[]> {
  if (!env.isConfigured()) {
    return [];
  }

  const supabase = await createServerClient();
  let query = supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }

  if (filters?.query && filters.query.trim()) {
    const search = `%${filters.query.trim()}%`;
    query = query.or(
      `name.ilike.${search},primary_contact_name.ilike.${search},primary_contact_email.ilike.${search}`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching clients:", error.message);
    return [];
  }

  const clientRows = (data as Client[]) || [];
  const teamMembers = await getTeamMembers();
  const teamMap = new Map(teamMembers.map((m) => [m.id, m]));

  return clientRows.map((client) => {
    const pmId = extractClientPmId(client as any);
    const pm = pmId ? teamMap.get(pmId) || null : null;
    return {
      ...client,
      notes: extractCleanNotes(client.notes),
      project_manager_id: pmId,
      project_manager: pm,
    };
  });
}

export async function getClientById(clientId: string): Promise<ClientWithPm | null> {
  if (!env.isConfigured() || !clientId) {
    return null;
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (error || !data) {
    return null;
  }

  const client = data as Client;
  const pmId = extractClientPmId(client as any);
  const teamMembers = await getTeamMembers();
  const pm = pmId ? teamMembers.find((m) => m.id === pmId) || null : null;

  return {
    ...client,
    notes: extractCleanNotes(client.notes),
    project_manager_id: pmId,
    project_manager: pm,
  };
}

export async function getClientStats(): Promise<ClientStats> {
  if (!env.isConfigured()) {
    return { total: 0, active: 0, paused: 0, completed: 0, archived: 0 };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.from("clients").select("status");

  if (error || !data) {
    return { total: 0, active: 0, paused: 0, completed: 0, archived: 0 };
  }

  const rows = data as unknown as Array<{ status: ClientStatus }>;

  const stats: ClientStats = {
    total: rows.length,
    active: 0,
    paused: 0,
    completed: 0,
    archived: 0,
  };

  rows.forEach((c) => {
    if (c.status === "ACTIVE") stats.active += 1;
    else if (c.status === "PAUSED") stats.paused += 1;
    else if (c.status === "COMPLETED") stats.completed += 1;
    else if (c.status === "ARCHIVED") stats.archived += 1;
  });

  return stats;
}

export async function getClientPortalUsers(clientId: string): Promise<Profile[]> {
  if (!env.isConfigured()) {
    return [];
  }

  const supabase = await createServerClient();
  const adminClient = getAdminClient();
  const dbClient = (adminClient || supabase) as any;

  const { data, error } = await dbClient
    .from("profiles")
    .select("*")
    .eq("client_id", clientId)
    .eq("role", "CLIENT")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching client portal users:", error.message);
    return [];
  }

  return (data as Profile[]) || [];
}

export interface ClientSnapshotItem {
  id: string;
  name: string;
  status: ClientStatus;
  primary_contact_name: string | null;
  active_project_count: number;
  total_project_count: number;
  outstanding_balance: number;
}

export async function getClientSnapshotsForAdmin(
  limit: number = 4
): Promise<ClientSnapshotItem[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await createServerClient();
    const { data: clientsData, error: clientErr } = await supabase
      .from("clients")
      .select(`
        id,
        name,
        status,
        primary_contact_name,
        projects(id, status),
        billing_schedule_items(
          id,
          amount,
          payments(amount, status)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (clientErr || !clientsData) {
      console.warn("Notice fetching client snapshots:", clientErr?.message);
      return [];
    }

    return clientsData.map((c: any) => {
      const projects = (c.projects as Array<{ id: string; status: string }>) || [];
      const activeProjectCount = projects.filter((p) => p.status === "ACTIVE").length;

      const scheduleItems = (c.billing_schedule_items as Array<{
        id: string;
        amount: number;
        payments: Array<{ amount: number; status: string }>;
      }>) || [];

      let outstandingBalance = 0;
      for (const item of scheduleItems) {
        const paid = (item.payments || [])
          .filter((p) => p.status === "PAID")
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        outstandingBalance += Math.max(0, Number(item.amount) - paid);
      }

      return {
        id: c.id,
        name: c.name,
        status: c.status as ClientStatus,
        primary_contact_name: c.primary_contact_name,
        active_project_count: activeProjectCount,
        total_project_count: projects.length,
        outstanding_balance: outstandingBalance,
      };
    });
  } catch (err) {
    console.warn("Unexpected error in getClientSnapshotsForAdmin:", err);
    return [];
  }
}

