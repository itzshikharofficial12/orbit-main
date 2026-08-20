import { createServerClient } from "@/lib/supabase/server";
import type {
  ClientRequestWithRelations,
  RequestFilterParams,
  RequestStats,
  RequestMessage,
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
        created_by_profile:profiles!client_requests_created_by_fkey(id, first_name, last_name, email, role),
        resolved_by_profile:profiles!client_requests_resolved_by_fkey(id, first_name, last_name, email, role),
        messages:request_messages(id, message, created_at, sender_id)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isSchemaCacheMissingTable(error)) return [];
      console.warn("Notice fetching client requests by project ID:", error.message || error);
      return [];
    }

    const rows = (data as unknown as ClientRequestWithRelations[]) || [];
    return rows.map((r) => ({
      ...r,
      messages_count: r.messages?.length || 0,
    }));
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
  if (!env.isConfigured() || !clientId) return [];

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("client_requests")
      .select(`
        *,
        deliverable:deliverables(id, title, status, url, expected_delivery_date),
        project:projects(id, name, service_type, status),
        created_by_profile:profiles!client_requests_created_by_fkey(id, first_name, last_name, email, role),
        resolved_by_profile:profiles!client_requests_resolved_by_fkey(id, first_name, last_name, email, role),
        messages:request_messages(id, message, created_at, sender_id)
      `)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isSchemaCacheMissingTable(error)) return [];
      console.warn("Notice fetching client requests for client:", error.message || error);
      return [];
    }

    const rows = (data as unknown as ClientRequestWithRelations[]) || [];
    return rows.map((r) => ({
      ...r,
      messages_count: r.messages?.length || 0,
    }));
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
        created_by_profile:profiles!client_requests_created_by_fkey(id, first_name, last_name, email, role),
        resolved_by_profile:profiles!client_requests_resolved_by_fkey(id, first_name, last_name, email, role),
        messages:request_messages(id, message, created_at, sender_id)
      `)
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }

    if (filters?.priority && filters.priority !== "ALL") {
      query = query.eq("priority", filters.priority);
    }

    if (filters?.category && filters.category !== "ALL") {
      query = query.eq("category", filters.category);
    }

    if (filters?.clientId && filters.clientId !== "ALL") {
      query = query.eq("client_id", filters.clientId);
    }

    if (filters?.projectId && filters.projectId !== "ALL") {
      query = query.eq("project_id", filters.projectId);
    }

    const { data, error } = await query;

    if (error) {
      if (isSchemaCacheMissingTable(error)) return [];
      console.warn("Notice fetching all requests for admin:", error.message || error);
      return [];
    }

    let results = (data as unknown as ClientRequestWithRelations[]) || [];

    // Attach message counts
    results = results.map((r) => ({
      ...r,
      messages_count: r.messages?.length || 0,
    }));

    // Post-filter search query if present
    if (filters?.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      results = results.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.reference_number && r.reference_number.toLowerCase().includes(q)) ||
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
  if (!env.isConfigured() || !requestId) return null;

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("client_requests")
      .select(`
        *,
        client:clients(id, name, primary_contact_name, primary_contact_email),
        project:projects(id, name, service_type, status),
        deliverable:deliverables(id, title, status, url, expected_delivery_date),
        created_by_profile:profiles!client_requests_created_by_fkey(id, first_name, last_name, email, role),
        resolved_by_profile:profiles!client_requests_resolved_by_fkey(id, first_name, last_name, email, role)
      `)
      .eq("id", requestId)
      .maybeSingle();

    if (error || !data) {
      if (error && !isSchemaCacheMissingTable(error)) {
        console.warn("Notice fetching request by ID:", error.message || error);
      }
      return null;
    }

    const request = data as unknown as ClientRequestWithRelations;

    // Fetch conversation messages with sender profile
    const { data: messagesData } = await supabase
      .from("request_messages")
      .select(`
        *,
        sender:profiles!request_messages_sender_id_fkey(id, first_name, last_name, email, role)
      `)
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    request.messages = (messagesData as unknown as RequestMessage[]) || [];
    request.messages_count = request.messages.length;

    return request;
  } catch (err) {
    if (!isSchemaCacheMissingTable(err)) {
      console.warn("Unexpected error fetching request by ID:", err);
    }
    return null;
  }
}

export async function getClientRequestStats(clientId: string): Promise<RequestStats> {
  if (!env.isConfigured() || !clientId) {
    return { total: 0, open: 0, inProgress: 0, waitingForClient: 0, resolved: 0, closed: 0 };
  }

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("client_requests")
      .select("status")
      .eq("client_id", clientId);

    if (error || !data) {
      return { total: 0, open: 0, inProgress: 0, waitingForClient: 0, resolved: 0, closed: 0 };
    }

    const rows = (data as unknown as { status: string }[]) || [];
    const total = rows.length;
    const open = rows.filter((r) => r.status === "OPEN").length;
    const inProgress = rows.filter((r) => r.status === "IN_PROGRESS").length;
    const waitingForClient = rows.filter((r) => r.status === "WAITING_FOR_CLIENT").length;
    const resolved = rows.filter((r) => r.status === "RESOLVED").length;
    const closed = rows.filter((r) => r.status === "CLOSED").length;

    return { total, open, inProgress, waitingForClient, resolved, closed };
  } catch {
    return { total: 0, open: 0, inProgress: 0, waitingForClient: 0, resolved: 0, closed: 0 };
  }
}

export async function getRequestStats(): Promise<RequestStats> {
  if (!env.isConfigured()) {
    return { total: 0, open: 0, inProgress: 0, waitingForClient: 0, resolved: 0, closed: 0 };
  }

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("client_requests")
      .select("status");

    if (error || !data) {
      return { total: 0, open: 0, inProgress: 0, waitingForClient: 0, resolved: 0, closed: 0 };
    }

    const rows = (data as unknown as { status: string }[]) || [];
    const total = rows.length;
    const open = rows.filter((r) => r.status === "OPEN").length;
    const inProgress = rows.filter((r) => r.status === "IN_PROGRESS").length;
    const waitingForClient = rows.filter((r) => r.status === "WAITING_FOR_CLIENT").length;
    const resolved = rows.filter((r) => r.status === "RESOLVED").length;
    const closed = rows.filter((r) => r.status === "CLOSED").length;

    return { total, open, inProgress, waitingForClient, resolved, closed };
  } catch {
    return { total: 0, open: 0, inProgress: 0, waitingForClient: 0, resolved: 0, closed: 0 };
  }
}
