"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import {
  createProjectSchema,
  updateProjectSchema,
  updateProjectStatusSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  updateMilestoneStatusSchema,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "./schema";
import type {
  ProjectActionResult,
  Project,
  ProjectStatus,
  Milestone,
  MilestoneStatus,
  Task,
  TaskStatus,
} from "./types";
import type {
  ProjectInsert,
  ProjectUpdate,
  MilestoneInsert,
  MilestoneUpdate,
  TaskInsert,
  TaskUpdate,
} from "@/lib/supabase/types";
import { notifyClientUsers } from "@/modules/notifications/service";
import { env } from "@/lib/env";

// ==========================================================
// 1. PROJECT ACTIONS
// ==========================================================

export async function createProjectAction(formData: FormData): Promise<ProjectActionResult<Project>> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured. Please add your credentials to .env.local.",
    };
  }

  const raw = {
    name: formData.get("name") as string,
    client_id: formData.get("client_id") as string,
    service_type: formData.get("service_type") as string,
    description: (formData.get("description") as string) || "",
    status: (formData.get("status") as string) || "PLANNING",
    start_date: (formData.get("start_date") as string) || "",
    target_date: (formData.get("target_date") as string) || "",
  };

  const validation = createProjectSchema.safeParse(raw);

  if (!validation.success) {
    const fieldErrors: Record<string, string[]> = {};
    validation.error.errors.forEach((err) => {
      const field = err.path.join(".");
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(err.message);
    });

    return {
      success: false,
      error: validation.error.errors[0]?.message || "Validation failed",
      fieldErrors,
    };
  }

  try {
    const supabase = await createServerClient();
    const insertPayload: ProjectInsert = {
      name: validation.data.name,
      client_id: validation.data.client_id,
      service_type: validation.data.service_type,
      description: validation.data.description || null,
      status: validation.data.status,
      start_date: validation.data.start_date || null,
      target_date: validation.data.target_date || null,
    };

    const { data, error } = await supabase
      .from("projects")
      .insert(insertPayload as never)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to create project in database",
      };
    }

    revalidatePath("/hq/projects");
    revalidatePath(`/hq/clients/${validation.data.client_id}`);
    revalidatePath("/hq");

    return {
      success: true,
      data: data as Project,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateProjectAction(
  projectId: string,
  formData: FormData
): Promise<ProjectActionResult<Project>> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const raw = {
    name: formData.get("name") as string,
    service_type: formData.get("service_type") as string,
    description: (formData.get("description") as string) || "",
    status: (formData.get("status") as string) || "PLANNING",
    start_date: (formData.get("start_date") as string) || "",
    target_date: (formData.get("target_date") as string) || "",
  };

  const validation = updateProjectSchema.safeParse(raw);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Validation failed",
    };
  }

  try {
    const supabase = await createServerClient();
    const updatePayload: ProjectUpdate = {
      name: validation.data.name,
      service_type: validation.data.service_type,
      description: validation.data.description || null,
      status: validation.data.status,
      start_date: validation.data.start_date || null,
      target_date: validation.data.target_date || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("projects")
      .update(updatePayload as never)
      .eq("id", projectId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to update project",
      };
    }

    const updated = data as Project;
    revalidatePath("/hq/projects");
    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/hq/clients/${updated.client_id}`);
    revalidatePath("/hq");

    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateProjectStatusAction(
  projectId: string,
  status: ProjectStatus
): Promise<ProjectActionResult<Project>> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const validation = updateProjectStatusSchema.safeParse({ projectId, status });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Invalid status",
    };
  }

  try {
    const supabase = await createServerClient();
    const updatePayload: ProjectUpdate = {
      status: validation.data.status,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("projects")
      .update(updatePayload as never)
      .eq("id", projectId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to update project status",
      };
    }

    const updated = data as Project;

    if (updated.client_id) {
      try {
        await notifyClientUsers({
          clientId: updated.client_id,
          type: "PROJECT_STATUS_CHANGED",
          title: "Project Status Updated",
          message: `"${updated.name}" is now marked as ${validation.data.status.replace(/_/g, " ")}.`,
          link: `/client/projects/${projectId}`,
        });
      } catch {
        // Notification failure should not fail action
      }
    }

    revalidatePath("/hq/projects");
    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath(`/hq/clients/${updated.client_id}`);
    revalidatePath("/hq");

    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

// ==========================================================
// 2. MILESTONE ACTIONS
// ==========================================================

export async function createMilestoneAction(
  formData: FormData
): Promise<ProjectActionResult<Milestone>> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const raw = {
    project_id: formData.get("project_id") as string,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || "",
    status: (formData.get("status") as string) || "NOT_STARTED",
    position: Number(formData.get("position") || 0),
  };

  const validation = createMilestoneSchema.safeParse(raw);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Validation failed",
    };
  }

  try {
    const supabase = await createServerClient();
    const insertPayload: MilestoneInsert = {
      project_id: validation.data.project_id,
      name: validation.data.name,
      description: validation.data.description || null,
      status: validation.data.status,
      position: validation.data.position,
    };

    const { data, error } = await supabase
      .from("milestones")
      .insert(insertPayload as never)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to create milestone",
      };
    }

    revalidatePath(`/hq/projects/${validation.data.project_id}`);
    revalidatePath("/hq/projects");

    return {
      success: true,
      data: data as Milestone,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateMilestoneStatusAction(
  milestoneId: string,
  projectId: string,
  status: MilestoneStatus
): Promise<ProjectActionResult<Milestone>> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const validation = updateMilestoneStatusSchema.safeParse({ milestoneId, status });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Invalid milestone status",
    };
  }

  try {
    const supabase = await createServerClient();
    const updatePayload: MilestoneUpdate = {
      status: validation.data.status,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("milestones")
      .update(updatePayload as never)
      .eq("id", milestoneId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to update milestone status",
      };
    }

    if (validation.data.status === "COMPLETED") {
      try {
        const { data: proj } = await supabase
          .from("projects")
          .select("name, client_id")
          .eq("id", projectId)
          .maybeSingle();

        const projectRecord = proj as { name: string; client_id: string | null } | null;
        if (projectRecord?.client_id) {
          await notifyClientUsers({
            clientId: projectRecord.client_id,
            type: "MILESTONE_COMPLETED",
            title: "Milestone Completed",
            message: `"${(data as Milestone).name}" milestone has been completed for ${projectRecord.name}.`,
            link: `/client/projects/${projectId}`,
          });
        }
      } catch {
        // Notification failure should not fail action
      }
    }

    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath("/hq/projects");

    return {
      success: true,
      data: data as Milestone,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateMilestoneAction(
  milestoneId: string,
  projectId: string,
  formData: FormData
): Promise<ProjectActionResult<Milestone>> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || "",
    status: formData.get("status") as string,
  };

  const validation = updateMilestoneSchema.safeParse(raw);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Validation failed",
    };
  }

  try {
    const supabase = await createServerClient();
    const updatePayload: MilestoneUpdate = {
      name: validation.data.name,
      description: validation.data.description || null,
      status: validation.data.status,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("milestones")
      .update(updatePayload as never)
      .eq("id", milestoneId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to update milestone",
      };
    }

    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath("/hq/projects");

    return {
      success: true,
      data: data as Milestone,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteMilestoneAction(
  milestoneId: string,
  projectId: string
): Promise<ProjectActionResult<{ id: string }>> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("milestones").delete().eq("id", milestoneId);

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to delete milestone",
      };
    }

    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath("/hq/projects");

    return {
      success: true,
      data: { id: milestoneId },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function moveMilestoneAction(
  milestoneId: string,
  projectId: string,
  direction: "up" | "down"
): Promise<ProjectActionResult<{ success: boolean }>> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  try {
    const supabase = await createServerClient();

    // 1. Fetch all milestones for this project ordered by position
    const { data: milestones, error: fetchError } = await supabase
      .from("milestones")
      .select("id, position")
      .eq("project_id", projectId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    const rows = (milestones || []) as unknown as Array<{ id: string; position: number | null }>;

    if (fetchError || rows.length < 2) {
      return {
        success: false,
        error: fetchError?.message || "Cannot reorder milestones",
      };
    }

    const currentIndex = rows.findIndex((m) => m.id === milestoneId);
    if (currentIndex === -1) {
      return {
        success: false,
        error: "Milestone not found in project",
      };
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= rows.length) {
      return {
        success: true,
        data: { success: true },
      };
    }

    const currentMilestone = rows[currentIndex];
    const targetMilestone = rows[targetIndex];

    const posA = currentMilestone.position ?? currentIndex;
    const posB = targetMilestone.position ?? targetIndex;

    const newPosCurrent = posA === posB ? (direction === "up" ? posB - 1 : posB + 1) : posB;
    const newPosTarget = posA === posB ? posA : posA;

    await Promise.all([
      supabase
        .from("milestones")
        .update({ position: newPosCurrent, updated_at: new Date().toISOString() } as never)
        .eq("id", currentMilestone.id),
      supabase
        .from("milestones")
        .update({ position: newPosTarget, updated_at: new Date().toISOString() } as never)
        .eq("id", targetMilestone.id),
    ]);

    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath("/hq/projects");

    return {
      success: true,
      data: { success: true },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

// ==========================================================
// 3. TASK ACTIONS
// ==========================================================

export async function createTaskAction(
  formData: FormData,
  projectId: string
): Promise<ProjectActionResult<Task>> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const raw = {
    milestone_id: formData.get("milestone_id") as string,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || "",
    status: (formData.get("status") as string) || "TODO",
    priority: (formData.get("priority") as string) || "MEDIUM",
    due_date: (formData.get("due_date") as string) || "",
    client_visible: formData.get("client_visible") !== "false",
    position: Number(formData.get("position") || 0),
  };

  const validation = createTaskSchema.safeParse(raw);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Validation failed",
    };
  }

  try {
    const supabase = await createServerClient();
    const insertPayload: TaskInsert = {
      milestone_id: validation.data.milestone_id,
      title: validation.data.title,
      description: validation.data.description || null,
      status: validation.data.status,
      priority: validation.data.priority,
      due_date: validation.data.due_date || null,
      client_visible: validation.data.client_visible,
      position: validation.data.position,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(insertPayload as never)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to create task",
      };
    }

    revalidatePath(`/hq/projects/${projectId}`);

    return {
      success: true,
      data: data as Task,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateTaskStatusAction(
  taskId: string,
  projectId: string,
  status: TaskStatus
): Promise<ProjectActionResult<Task>> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const validation = updateTaskStatusSchema.safeParse({ taskId, status });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Invalid task status",
    };
  }

  try {
    const supabase = await createServerClient();
    const updatePayload: TaskUpdate = {
      status: validation.data.status,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("tasks")
      .update(updatePayload as never)
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to update task status",
      };
    }

    revalidatePath(`/hq/projects/${projectId}`);

    return {
      success: true,
      data: data as Task,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateTaskAction(
  taskId: string,
  projectId: string,
  formData: FormData
): Promise<ProjectActionResult<Task>> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const clientVisibleRaw = formData.get("client_visible");
  const client_visible =
    clientVisibleRaw === "true" ||
    clientVisibleRaw === "1" ||
    clientVisibleRaw === "on";

  const raw = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || "",
    status: formData.get("status") as string,
    priority: formData.get("priority") as string,
    due_date: (formData.get("due_date") as string) || "",
    client_visible,
  };

  const validation = updateTaskSchema.safeParse(raw);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Validation failed",
    };
  }

  try {
    const supabase = await createServerClient();
    const updatePayload: TaskUpdate = {
      title: validation.data.title,
      description: validation.data.description || null,
      status: validation.data.status,
      priority: validation.data.priority,
      due_date: validation.data.due_date || null,
      client_visible: validation.data.client_visible,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("tasks")
      .update(updatePayload as never)
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to update task",
      };
    }

    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath("/hq/projects");
    revalidatePath("/client");

    return {
      success: true,
      data: data as Task,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteTaskAction(
  taskId: string,
  projectId: string
): Promise<ProjectActionResult<{ id: string }>> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to delete task",
      };
    }

    revalidatePath(`/hq/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath("/hq/projects");
    revalidatePath("/client");

    return {
      success: true,
      data: { id: taskId },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}
