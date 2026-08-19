import { createServerClient } from "@/lib/supabase/server";
import type {
  ClientRequestWithRelations,
  RequestFilterParams,
  RequestStats,
} from "./types";
import { env } from "@/lib/env";

function isSchemaCacheMissingTable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const msg = "message" in err ? String(err.message) : "";
  const code = "code" in err ? String(err.code) : "";
  return (
    msg.includes("Could not find the table 'public.client_requests'") ||
    code === "PGRST204" ||
    code === "42P01"
  );
}

export async function getClientRequestsByProjectId(
  projectId: string
): Promise<ClientRequestWithRelations[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("client_requests")
      .select(`
        *,
        deliverable:deliverables(id, title, status, url, expected_delivery_date),
        project:projects(id, name, service_type, status),
        created_by_profile:profiles!client_requests_created_by_fkey(id, first_name, last_name, email),
        resolved_by_profile:profiles!client_requests_resolved_by_fkey(id, first_name, last_name, email)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isSchemaCacheMissingTable(error)) {
        return [];
      }
      console.warn("Notice fetching client requests by project ID:", error.message || error);
      // Fallback if relations fail
      try {
        const fallback = await supabase
          .from("client_requests")
          .select("*, deliverable:deliverables(id, title, status, url)")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        return (fallback.data as unknown as ClientRequestWithRelations[]) || [];
      } catch {
        return [];
      }
    }

    return (data as unknown as ClientRequestWithRelations[]) || [];
  } catch (err) {
    if (!isSchemaCacheMissingTable(err)) {
      console.warn("Unexpected error fetching client requests:", err);
    }
    return [];
  }
}

export async function getClientRequestsForClient(
  clientId: string
): Promise<ClientRequestWithRelations[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("client_requests")
      .select(`
        *,
        deliverable:deliverables(id, title, status, url, expected_delivery_date),
        project:projects(id, name, service_type, status),
        created_by_profile:profiles!client_requests_created_by_fkey(id, first_name, last_name, email),
        resolved_by_profile:profiles!client_requests_resolved_by_fkey(id, first_name, last_name, email)
      `)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isSchemaCacheMissingTable(error)) {
        return [];
      }
      console.warn("Notice fetching client requests for client:", error.message || error);
      return [];
    }

    return (data as unknown as ClientRequestWithRelations[]) || [];
  } catch (err) {
    if (!isSchemaCacheMissingTable(err)) {
      console.warn("Unexpected error fetching client requests for client:", err);
    }
    return [];
  }
}

export async function getAllRequestsForAdmin(
  filters?: RequestFilterParams
): Promise<ClientRequestWithRelations[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await createServerClient();
    let query = supabase
      .from("client_requests")
      .select(`
        *,
        client:clients(id, name, primary_contact_name, primary_contact_email),
        project:projects(id, name, service_type, status),
        deliverable:deliverables(id, title, status, url, expected_delivery_date),
        created_by_profile:profiles!client_requests_created_by_fkey(id, first_name, last_name, email),
        resolved_by_profile:profiles!client_requests_resolved_by_fkey(id, first_name, last_name, email)
      `)
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }

    if (filters?.priority && filters.priority !== "ALL") {
      query = query.eq("priority", filters.priority);
    }

    if (filters?.clientId && filters.clientId !== "ALL") {
      query = query.eq("client_id", filters.clientId);
    }

    if (filters?.projectId && filters.projectId !== "ALL") {
      query = query.eq("project_id", filters.projectId);
    }

    const { data, error } = await query;

    if (error) {
      if (isSchemaCacheMissingTable(error)) {
        return [];
      }
      console.warn("Notice fetching all requests for admin:", error.message || error);
      return [];
    }

    let results = (data as unknown as ClientRequestWithRelations[]) || [];

    // Filter by search term on client side / post query if present
    if (filters?.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      results = results.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.client?.name?.toLowerCase().includes(q) ||
          r.project?.name?.toLowerCase().includes(q) ||
          r.deliverable?.title?.toLowerCase().includes(q)
      );
    }

    return results;
  } catch (err) {
    if (!isSchemaCacheMissingTable(err)) {
      console.warn("Unexpected error fetching all requests for admin:", err);
    }
    return [];
  }
}

export async function getRequestById(
  requestId: string
): Promise<ClientRequestWithRelations | null> {
  if (!env.isConfigured()) return null;

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("client_requests")
      .select(`
        *,
        client:clients(id, name, primary_contact_name, primary_contact_email),
        project:projects(id, name, service_type, status),
        deliverable:deliverables(id, title, status, url, expected_delivery_date),
        created_by_profile:profiles!client_requests_created_by_fkey(id, first_name, last_name, email),
        resolved_by_profile:profiles!client_requests_resolved_by_fkey(id, first_name, last_name, email)
      `)
      .eq("id", requestId)
      .maybeSingle();

    if (error) {
      if (isSchemaCacheMissingTable(error)) {
        return null;
      }
      console.warn("Notice fetching request by ID:", error.message || error);
      return null;
    }

    return (data as unknown as ClientRequestWithRelations) || null;
  } catch (err) {
    if (!isSchemaCacheMissingTable(err)) {
      console.warn("Unexpected error fetching request by ID:", err);
    }
    return null;
  }
}

export async function getRequestStats(): Promise<RequestStats> {
  if (!env.isConfigured()) {
    return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 };
  }

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("client_requests")
      .select("status");

    if (error || !data) {
      return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 };
    }

    const rows = (data as unknown as { status: string }[]) || [];
    const total = rows.length;
    const open = rows.filter((r) => r.status === "OPEN").length;
    const inProgress = rows.filter((r) => r.status === "IN_PROGRESS").length;
    const resolved = rows.filter((r) => r.status === "RESOLVED").length;
    const closed = rows.filter((r) => r.status === "CLOSED").length;

    return { total, open, inProgress, resolved, closed };
  } catch (err) {
    return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 };
  }
}
