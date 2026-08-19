import { createServerClient } from "@/lib/supabase/server";
import type { DeliverableWithMilestone } from "./types";
import { env } from "@/lib/env";

export async function getDeliverablesByProjectId(
  projectId: string
): Promise<DeliverableWithMilestone[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("deliverables")
      .select(`
        *,
        milestone:milestones(id, name),
        approved_by_profile:profiles!deliverables_approved_by_fkey(id, first_name, last_name),
        changes_requested_by_profile:profiles!deliverables_changes_requested_by_fkey(id, first_name, last_name)
      `)
      .eq("project_id", projectId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching deliverables by project ID:", error.message || error);
      // Fallback without profile joins if FK aliases vary
      const fallback = await supabase
        .from("deliverables")
        .select("*, milestone:milestones(id, name)")
        .eq("project_id", projectId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      return (fallback.data as unknown as DeliverableWithMilestone[]) || [];
    }

    return (data as unknown as DeliverableWithMilestone[]) || [];
  } catch (err) {
    console.error("Unexpected error fetching deliverables:", err);
    return [];
  }
}

export async function getClientVisibleDeliverablesByProjectId(
  projectId: string
): Promise<DeliverableWithMilestone[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("deliverables")
      .select("*, milestone:milestones(id, name)")
      .eq("project_id", projectId)
      .eq("client_visible", true)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching client-visible deliverables:", error.message || error);
      return [];
    }

    return (data as unknown as DeliverableWithMilestone[]) || [];
  } catch (err) {
    console.error("Unexpected error fetching client-visible deliverables:", err);
    return [];
  }
}

export async function getPendingReviewDeliverablesForClient(): Promise<DeliverableWithMilestone[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("deliverables")
      .select("*, milestone:milestones(id, name)")
      .eq("client_visible", true)
      .eq("status", "READY_FOR_REVIEW")
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error fetching review pending deliverables:", error.message || error);
      return [];
    }

    return (data as unknown as DeliverableWithMilestone[]) || [];
  } catch (err) {
    console.error("Unexpected error fetching review pending deliverables:", err);
    return [];
  }
}

export async function getRecentDeliverablesForClient(
  limit: number = 3
): Promise<DeliverableWithMilestone[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("deliverables")
      .select("*, milestone:milestones(id, name)")
      .eq("client_visible", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent client deliverables:", error.message || error);
      return [];
    }

    return (data as unknown as DeliverableWithMilestone[]) || [];
  } catch (err) {
    console.error("Unexpected error fetching recent client deliverables:", err);
    return [];
  }
}
