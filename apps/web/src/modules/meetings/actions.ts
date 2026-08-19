"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, getAuthenticatedProfile } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  createMeetingSchema,
  updateMeetingSchema,
  cancelMeetingSchema,
  completeMeetingSchema,
} from "./schema";
import type { MeetingActionResult, Meeting } from "./types";
import type { MeetingInsert, MeetingUpdate } from "@/lib/supabase/types";
import { notifyClientUsers } from "@/modules/notifications/service";
import { env } from "@/lib/env";

function formatNotificationDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatNotificationTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export async function createMeetingAction(
  formData: FormData
): Promise<MeetingActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase environment not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Authentication required." };
  }

  if (profile.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only Celestia Studios Admins can schedule meetings." };
  }

  const rawData = {
    title: formData.get("title"),
    client_id: formData.get("client_id"),
    project_id: formData.get("project_id"),
    date: formData.get("date"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    meeting_url: formData.get("meeting_url"),
    description: formData.get("description"),
  };

  const parsed = createMeetingSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstErr = parsed.error.issues[0]?.message || "Validation failed";
    return { success: false, error: firstErr };
  }

  const { title, client_id, project_id, date, start_time, end_time, meeting_url, description } =
    parsed.data;

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    // 1. Verify Client exists
    const { data: clientRecord, error: clientErr } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", client_id)
      .maybeSingle();

    if (clientErr || !clientRecord) {
      return { success: false, error: "Selected client does not exist." };
    }

    // 2. If Project is selected, verify it belongs to this Client
    if (project_id) {
      const { data: projectRecord, error: projErr } = await supabase
        .from("projects")
        .select("id, client_id")
        .eq("id", project_id)
        .maybeSingle();

      if (projErr || !projectRecord || projectRecord.client_id !== client_id) {
        return {
          success: false,
          error: "Selected project does not belong to the selected client.",
        };
      }
    }

    // 3. Compute ISO timestamps
    const startsAt = new Date(`${date}T${start_time.slice(0, 5)}:00`).toISOString();
    const endsAt = new Date(`${date}T${end_time.slice(0, 5)}:00`).toISOString();

    const insertPayload: MeetingInsert = {
      client_id,
      project_id: project_id || null,
      title,
      description: description || null,
      meeting_url,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "SCHEDULED",
      created_by: profile.id,
    };

    const { data: newMeeting, error: insertErr } = await supabase
      .from("meetings")
      .insert(insertPayload as never)
      .select()
      .maybeSingle();

    if (insertErr || !newMeeting) {
      console.error("Error inserting meeting:", insertErr);
      const isMissingTable =
        insertErr?.message?.includes("Could not find the table 'public.meetings'") ||
        insertErr?.code === "PGRST204" ||
        insertErr?.code === "42P01";

      return {
        success: false,
        error: isMissingTable
          ? "Database migration required: Please run 00010_meetings_schema.sql in Supabase SQL Editor."
          : insertErr?.message || "Failed to schedule meeting.",
      };
    }

    const meeting = newMeeting as Meeting;

    // 4. Dispatch Client Notification
    const formattedDate = formatNotificationDate(startsAt);
    const formattedTime = formatNotificationTime(startsAt);

    await notifyClientUsers({
      clientId: client_id,
      type: "MEETING_SCHEDULED",
      title: "New meeting scheduled",
      message: `"${title}" has been scheduled for ${formattedDate} at ${formattedTime}.`,
      link: "/client/meetings",
    });

    // 5. Revalidate paths
    revalidatePath("/hq/meetings");
    revalidatePath("/hq");
    revalidatePath("/client/meetings");
    revalidatePath("/client");

    return {
      success: true,
      meeting,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}

export async function updateMeetingAction(
  formData: FormData
): Promise<MeetingActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase environment not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Authentication required." };
  }

  if (profile.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only Celestia Studios Admins can update meetings." };
  }

  const rawData = {
    meeting_id: formData.get("meeting_id"),
    title: formData.get("title"),
    client_id: formData.get("client_id"),
    project_id: formData.get("project_id"),
    date: formData.get("date"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    meeting_url: formData.get("meeting_url"),
    description: formData.get("description"),
  };

  const parsed = updateMeetingSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstErr = parsed.error.issues[0]?.message || "Validation failed";
    return { success: false, error: firstErr };
  }

  const {
    meeting_id,
    title,
    client_id,
    project_id,
    date,
    start_time,
    end_time,
    meeting_url,
    description,
  } = parsed.data;

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    // 1. Fetch existing meeting
    const { data: existingMeeting, error: fetchErr } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", meeting_id)
      .maybeSingle();

    if (fetchErr || !existingMeeting) {
      return { success: false, error: "Meeting not found." };
    }

    const current = existingMeeting as Meeting;

    // 2. If Project is selected, verify it belongs to this Client
    if (project_id) {
      const { data: projectRecord, error: projErr } = await supabase
        .from("projects")
        .select("id, client_id")
        .eq("id", project_id)
        .maybeSingle();

      if (projErr || !projectRecord || projectRecord.client_id !== client_id) {
        return {
          success: false,
          error: "Selected project does not belong to the selected client.",
        };
      }
    }

    // 3. Compute ISO timestamps
    const startsAt = new Date(`${date}T${start_time.slice(0, 5)}:00`).toISOString();
    const endsAt = new Date(`${date}T${end_time.slice(0, 5)}:00`).toISOString();

    const isRescheduled =
      new Date(current.starts_at).getTime() !== new Date(startsAt).getTime() ||
      new Date(current.ends_at).getTime() !== new Date(endsAt).getTime();

    const updatePayload: MeetingUpdate = {
      client_id,
      project_id: project_id || null,
      title,
      description: description || null,
      meeting_url,
      starts_at: startsAt,
      ends_at: endsAt,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedData, error: updateErr } = await supabase
      .from("meetings")
      .update(updatePayload as never)
      .eq("id", meeting_id)
      .select()
      .maybeSingle();

    if (updateErr || !updatedData) {
      return { success: false, error: updateErr?.message || "Failed to update meeting." };
    }

    const updated = updatedData as Meeting;

    // 4. If Rescheduled, notify Client
    if (isRescheduled) {
      const formattedDate = formatNotificationDate(startsAt);
      const formattedTime = formatNotificationTime(startsAt);

      await notifyClientUsers({
        clientId: client_id,
        type: "MEETING_UPDATED",
        title: "Meeting updated",
        message: `"${title}" has been rescheduled to ${formattedDate} at ${formattedTime}.`,
        link: "/client/meetings",
      });
    }

    // 5. Revalidate paths
    revalidatePath("/hq/meetings");
    revalidatePath("/hq");
    revalidatePath("/client/meetings");
    revalidatePath("/client");

    return {
      success: true,
      meeting: updated,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}

export async function cancelMeetingAction(
  formDataOrId: FormData | string
): Promise<MeetingActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase environment not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Authentication required." };
  }

  if (profile.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only Celestia Studios Admins can cancel meetings." };
  }

  const meetingId =
    typeof formDataOrId === "string"
      ? formDataOrId
      : (formDataOrId.get("meeting_id") as string);

  const parsed = cancelMeetingSchema.safeParse({ meeting_id: meetingId });
  if (!parsed.success) {
    return { success: false, error: "Invalid meeting ID." };
  }

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    const { data: existingMeeting, error: fetchErr } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", meetingId)
      .maybeSingle();

    if (fetchErr || !existingMeeting) {
      return { success: false, error: "Meeting not found." };
    }

    const current = existingMeeting as Meeting;

    const { data: updatedData, error: updateErr } = await supabase
      .from("meetings")
      .update({
        status: "CANCELLED",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", meetingId)
      .select()
      .maybeSingle();

    if (updateErr || !updatedData) {
      return { success: false, error: updateErr?.message || "Failed to cancel meeting." };
    }

    const updated = updatedData as Meeting;

    // Dispatch Client Notification
    const formattedDate = formatNotificationDate(current.starts_at);
    await notifyClientUsers({
      clientId: current.client_id,
      type: "MEETING_CANCELLED",
      title: "Meeting cancelled",
      message: `"${current.title}" scheduled for ${formattedDate} has been cancelled.`,
      link: "/client/meetings",
    });

    revalidatePath("/hq/meetings");
    revalidatePath("/hq");
    revalidatePath("/client/meetings");
    revalidatePath("/client");

    return {
      success: true,
      meeting: updated,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}

export async function completeMeetingAction(
  formDataOrId: FormData | string
): Promise<MeetingActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase environment not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Authentication required." };
  }

  if (profile.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only Celestia Studios Admins can complete meetings." };
  }

  const meetingId =
    typeof formDataOrId === "string"
      ? formDataOrId
      : (formDataOrId.get("meeting_id") as string);

  const parsed = completeMeetingSchema.safeParse({ meeting_id: meetingId });
  if (!parsed.success) {
    return { success: false, error: "Invalid meeting ID." };
  }

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    const { data: updatedData, error: updateErr } = await supabase
      .from("meetings")
      .update({
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", meetingId)
      .select()
      .maybeSingle();

    if (updateErr || !updatedData) {
      return { success: false, error: updateErr?.message || "Failed to mark meeting completed." };
    }

    revalidatePath("/hq/meetings");
    revalidatePath("/hq");
    revalidatePath("/client/meetings");
    revalidatePath("/client");

    return {
      success: true,
      meeting: updatedData as Meeting,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}
