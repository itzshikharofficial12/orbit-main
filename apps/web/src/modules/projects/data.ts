import { createServerClient } from "@/lib/supabase/server";
import type {
  ProjectWithClient,
  ProjectDetails,
  MilestoneWithTasks,
  ProjectFilters,
  ProjectStats,
  Task,
  Project,
} from "./types";
import { env } from "@/lib/env";

export async function getProjects(filters?: ProjectFilters): Promise<ProjectWithClient[]> {
  if (!env.isConfigured()) {
    return [];
  }

  const supabase = await createServerClient();

  let query = supabase
    .from("projects")
    .select(`
      *,
      client:clients(id, name, status, primary_contact_name, primary_contact_email),
      milestones(id, status)
    `)
    .order("created_at", { ascending: false });

  if (filters?.clientId) {
    query = query.eq("client_id", filters.clientId);
  }

  if (filters?.serviceType && filters.serviceType !== "ALL") {
    query = query.eq("service_type", filters.serviceType);
  }

  if (filters?.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }

  if (filters?.query && filters.query.trim()) {
    const search = `%${filters.query.trim()}%`;
    query = query.or(
      `name.ilike.${search},description.ilike.${search}`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching projects:", error.message);
    return [];
  }

  // Calculate dynamic progress from milestones for each project
  return (data || []).map((row: any) => {
    const milestones = (row.milestones as Array<{ id: string; status: string }>) || [];
    const milestoneCount = milestones.length;
    const completedMilestoneCount = milestones.filter(
      (m) => m.status === "COMPLETED"
    ).length;

    const progress =
      milestoneCount === 0
        ? 0
        : Math.round((completedMilestoneCount / milestoneCount) * 100);

    const { milestones: _m, ...projectData } = row;

    return {
      ...(projectData as Project),
      client: row.client as ProjectWithClient["client"],
      milestone_count: milestoneCount,
      completed_milestone_count: completedMilestoneCount,
      progress,
    };
  });
}

export async function getProjectById(projectId: string): Promise<ProjectDetails | null> {
  if (!env.isConfigured()) {
    return null;
  }

  const supabase = await createServerClient();

  // 1. Fetch Project with Client
  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select(`
      *,
      client:clients(id, name, status, primary_contact_name, primary_contact_email)
    `)
    .eq("id", projectId)
    .single();

  if (projectError || !projectRow) {
    return null;
  }

  const rawProject = projectRow as any;

  // 2. Fetch Milestones with Tasks ordered by position
  const { data: milestonesData, error: _milestonesError } = await supabase
    .from("milestones")
    .select(`
      *,
      tasks(*)
    `)
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  const rawMilestones = (milestonesData || []) as any[];

  const milestones: MilestoneWithTasks[] = rawMilestones.map((m) => {
    const rawTasks = (m.tasks as Task[]) || [];
    const sortedTasks = [...rawTasks].sort((a, b) => (a.position || 0) - (b.position || 0));
    const completedTaskCount = sortedTasks.filter((t) => t.status === "COMPLETED").length;

    return {
      id: m.id,
      project_id: m.project_id,
      name: m.name,
      description: m.description,
      status: m.status,
      position: m.position,
      created_at: m.created_at,
      updated_at: m.updated_at,
      tasks: sortedTasks,
      task_count: sortedTasks.length,
      completed_task_count: completedTaskCount,
    };
  });

  const milestoneCount = milestones.length;
  const completedMilestoneCount = milestones.filter(
    (m) => m.status === "COMPLETED"
  ).length;

  const progress =
    milestoneCount === 0
      ? 0
      : Math.round((completedMilestoneCount / milestoneCount) * 100);

  return {
    ...(rawProject as Project),
    client: rawProject.client as ProjectWithClient["client"],
    milestones,
    milestone_count: milestoneCount,
    completed_milestone_count: completedMilestoneCount,
    progress,
  };
}

export async function getProjectsByClientId(clientId: string): Promise<ProjectWithClient[]> {
  return getProjects({ clientId });
}

export async function getProjectStats(): Promise<ProjectStats> {
  if (!env.isConfigured()) {
    return { total: 0, active: 0, planning: 0, in_review: 0, on_hold: 0, completed: 0, archived: 0 };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.from("projects").select("status");

  if (error || !data) {
    return { total: 0, active: 0, planning: 0, in_review: 0, on_hold: 0, completed: 0, archived: 0 };
  }

  const stats: ProjectStats = {
    total: data.length,
    active: 0,
    planning: 0,
    in_review: 0,
    on_hold: 0,
    completed: 0,
    archived: 0,
  };

  data.forEach((p: any) => {
    if (p.status === "ACTIVE") stats.active += 1;
    else if (p.status === "PLANNING") stats.planning += 1;
    else if (p.status === "IN_REVIEW") stats.in_review += 1;
    else if (p.status === "ON_HOLD") stats.on_hold += 1;
    else if (p.status === "COMPLETED") stats.completed += 1;
    else if (p.status === "ARCHIVED") stats.archived += 1;
  });

  return stats;
}
