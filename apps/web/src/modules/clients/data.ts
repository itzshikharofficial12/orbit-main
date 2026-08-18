import { createServerClient } from "@/lib/supabase/server";
import type { Client, ClientFilters, ClientStats, ClientStatus } from "./types";
import { env } from "@/lib/env";

export async function getClients(filters?: ClientFilters): Promise<Client[]> {
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

  return (data as Client[]) || [];
}

export async function getClientById(clientId: string): Promise<Client | null> {
  if (!env.isConfigured()) {
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

  return data as Client;
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
