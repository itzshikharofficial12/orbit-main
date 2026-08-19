import type {
  Meeting as SupabaseMeeting,
  MeetingInsert,
  MeetingUpdate,
  MeetingStatus,
  Client,
  Project,
  Profile,
} from "@/lib/supabase/types";

export type Meeting = SupabaseMeeting;
export type { MeetingInsert, MeetingUpdate, MeetingStatus };

export interface MeetingWithRelations extends Meeting {
  client?: Pick<
    Client,
    "id" | "name" | "status" | "primary_contact_name" | "primary_contact_email"
  > | null;
  project?: Pick<Project, "id" | "name" | "status" | "service_type"> | null;
  created_by_profile?: Pick<
    Profile,
    "id" | "first_name" | "last_name" | "email"
  > | null;
}

export type MeetingTabFilter = "UPCOMING" | "PAST" | "CANCELLED" | "ALL";

export interface MeetingFilterParams {
  tab?: MeetingTabFilter;
  clientId?: string;
  projectId?: string;
  query?: string;
}

export interface MeetingActionResult {
  success: boolean;
  meeting?: Meeting;
  error?: string;
}

export interface MeetingStats {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
}
