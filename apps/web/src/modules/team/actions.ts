"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, getAuthenticatedProfile } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  createTeamMemberSchema,
  updateTeamMemberSchema,
  assignProjectManagerSchema,
} from "./schema";
import { extractClientPmId, extractCleanNotes } from "./data";
import type {
  TeamMemberActionResult,
  AssignPmActionResult,
  EmployeeJobRole,
  EmployeeStatus,
} from "./types";

export async function createTeamMemberAction(
  formData: FormData
): Promise<TeamMemberActionResult> {
  const currentProfile = await getAuthenticatedProfile();
  if (!currentProfile || currentProfile.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized: Super Admin access required." };
  }

  const rawJobRole = (formData.get("job_role") as EmployeeJobRole) || "OTHER";
  const rawIsPm = formData.has("is_project_manager")
    ? formData.get("is_project_manager") === "true"
    : rawJobRole === "PROJECT_MANAGER";

  const rawData = {
    first_name: formData.get("first_name") as string,
    last_name: (formData.get("last_name") as string) || null,
    email: formData.get("email") as string,
    job_role: rawJobRole,
    department: (formData.get("department") as string) || null,
    is_project_manager: rawIsPm,
    status: (formData.get("status") as EmployeeStatus) || "ACTIVE",
    phone: (formData.get("phone") as string) || null,
  };

  const validation = createTeamMemberSchema.safeParse(rawData);
  if (!validation.success) {
    const fieldErrors: Record<string, string[]> = {};
    validation.error.errors.forEach((err) => {
      const field = err.path[0] as string;
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(err.message);
    });
    return { success: false, error: "Invalid team member data.", fieldErrors };
  }

  try {
    const adminClient = getAdminClient();
    if (!adminClient) {
      return { success: false, error: "Supabase service credentials not configured." };
    }

    // Check if user already exists
    const { data: existingProfiles } = await adminClient
      .from("profiles")
      .select("id, email")
      .ilike("email", validation.data.email.trim())
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      return {
        success: false,
        error: "A team member or user with this email already exists.",
      };
    }

    // Create user via Supabase Auth Admin
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: validation.data.email.trim().toLowerCase(),
        email_confirm: true,
        user_metadata: {
          first_name: validation.data.first_name.trim(),
          last_name: validation.data.last_name?.trim() || null,
          role: "EMPLOYEE",
          job_role: validation.data.job_role,
          department: validation.data.department || null,
          is_project_manager: validation.data.is_project_manager,
          status: validation.data.status,
          phone: validation.data.phone?.trim() || null,
        },
      });

    if (authError || !authData?.user) {
      return {
        success: false,
        error: authError?.message || "Failed to provision team member account.",
      };
    }

    // Ensure profile row is synced
    await adminClient.from("profiles").upsert({
      id: authData.user.id,
      email: validation.data.email.trim().toLowerCase(),
      first_name: validation.data.first_name.trim(),
      last_name: validation.data.last_name?.trim() || null,
      role: "EMPLOYEE",
      job_role: validation.data.job_role,
      status: validation.data.status,
      phone: validation.data.phone?.trim() || null,
      updated_at: new Date().toISOString(),
    } as never);

    revalidatePath("/hq/team");
    revalidatePath("/hq/clients");

    return {
      success: true,
      member: {
        id: authData.user.id,
        email: validation.data.email.trim().toLowerCase(),
        first_name: validation.data.first_name.trim(),
        last_name: validation.data.last_name?.trim() || null,
        role: "EMPLOYEE",
        job_role: validation.data.job_role,
        department: validation.data.department || null,
        is_project_manager: validation.data.is_project_manager,
        status: validation.data.status,
        phone: validation.data.phone?.trim() || null,
        avatar_url: null,
        created_at: authData.user.created_at,
        updated_at: new Date().toISOString(),
        assigned_clients_count: 0,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while adding team member.",
    };
  }
}

export async function updateTeamMemberAction(
  formData: FormData
): Promise<TeamMemberActionResult> {
  const currentProfile = await getAuthenticatedProfile();
  if (!currentProfile || currentProfile.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized: Super Admin access required." };
  }

  const rawJobRole = (formData.get("job_role") as EmployeeJobRole) || "OTHER";
  const rawIsPm = formData.has("is_project_manager")
    ? formData.get("is_project_manager") === "true"
    : undefined;

  const rawData = {
    id: formData.get("id") as string,
    first_name: formData.get("first_name") as string,
    last_name: (formData.get("last_name") as string) || null,
    job_role: rawJobRole,
    department: (formData.get("department") as string) || null,
    is_project_manager: rawIsPm,
    status: formData.get("status") as EmployeeStatus,
    phone: (formData.get("phone") as string) || null,
  };

  const validation = updateTeamMemberSchema.safeParse(rawData);
  if (!validation.success) {
    const fieldErrors: Record<string, string[]> = {};
    validation.error.errors.forEach((err) => {
      const field = err.path[0] as string;
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(err.message);
    });
    return { success: false, error: "Invalid update data.", fieldErrors };
  }

  try {
    const adminClient = getAdminClient();
    if (!adminClient) {
      return { success: false, error: "Supabase service credentials not configured." };
    }

    // 1. Update user metadata in Supabase Auth
    const { data: userData } = await adminClient.auth.admin.getUserById(validation.data.id);
    const existingMeta = userData?.user?.user_metadata || {};

    await adminClient.auth.admin.updateUserById(validation.data.id, {
      user_metadata: {
        ...existingMeta,
        first_name: validation.data.first_name.trim(),
        last_name: validation.data.last_name?.trim() || null,
        job_role: validation.data.job_role,
        department: validation.data.department !== undefined ? validation.data.department : existingMeta.department,
        is_project_manager: validation.data.is_project_manager,
        status: validation.data.status,
        phone: validation.data.phone?.trim() || null,
      },
    });

    // 2. Update profiles table
    await adminClient
      .from("profiles")
      .update({
        first_name: validation.data.first_name.trim(),
        last_name: validation.data.last_name?.trim() || null,
        job_role: validation.data.job_role,
        status: validation.data.status,
        phone: validation.data.phone?.trim() || null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", validation.data.id);

    revalidatePath("/hq/team");
    revalidatePath("/hq/clients");

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to update team member.",
    };
  }
}

export async function assignClientProjectManagerAction(
  clientId: string,
  projectManagerId: string | null,
  note?: string | null
): Promise<AssignPmActionResult> {
  const currentProfile = await getAuthenticatedProfile();
  if (!currentProfile || currentProfile.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized: Super Admin access required." };
  }

  const validation = assignProjectManagerSchema.safeParse({
    client_id: clientId,
    project_manager_id: projectManagerId || null,
    note: note || null,
  });

  if (!validation.success) {
    return { success: false, error: validation.error.errors[0]?.message || "Invalid assignment data." };
  }

  try {
    const supabase = await createServerClient();
    const admin = getAdminClient();
    const dbClient = (admin || supabase) as any;

    // 1. Get current client
    const { data: rawClient, error: fetchErr } = await supabase
      .from("clients")
      .select("id, name, notes, project_manager_id")
      .eq("id", clientId)
      .single();

    if (fetchErr || !rawClient) {
      return { success: false, error: "Client not found." };
    }

    const client = rawClient as { id: string; name: string; notes: string | null; project_manager_id: string | null };
    const previousPmId = extractClientPmId(client);
    const cleanNotes = extractCleanNotes(client.notes);

    // Format new notes payload with embedded PM ID for resilient sync
    let updatedNotes = cleanNotes;
    if (projectManagerId) {
      updatedNotes = cleanNotes
        ? `${cleanNotes}\n[PM: ${projectManagerId}]`
        : `[PM: ${projectManagerId}]`;
    }

    // 2. Update client record with BOTH project_manager_id and notes fallback
    const updatePayload: Record<string, any> = {
      project_manager_id: projectManagerId || null,
      notes: updatedNotes,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await dbClient
      .from("clients")
      .update(updatePayload)
      .eq("id", clientId);

    if (updateErr) {
      return { success: false, error: updateErr.message || "Failed to assign project manager." };
    }

    // 3. Log assignment history if table is available
    try {
      if (previousPmId !== projectManagerId) {
        await dbClient.from("client_pm_history").insert({
          client_id: clientId,
          previous_pm_id: previousPmId || null,
          new_pm_id: projectManagerId || null,
          changed_by: currentProfile.id,
          note: note || null,
        });
      }
    } catch (historyErr) {
      // Non-fatal if table doesn't exist
      console.warn("Notice: could not insert into client_pm_history:", historyErr);
    }

    revalidatePath(`/hq/clients/${clientId}`);
    revalidatePath("/hq/clients");
    revalidatePath("/hq/team");
    revalidatePath("/client");
    revalidatePath("/hq");

    return {
      success: true,
      message: projectManagerId
        ? "Project Manager assigned successfully."
        : "Project Manager assignment removed.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to assign Project Manager.",
    };
  }
}
