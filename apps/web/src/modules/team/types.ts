import type { Profile } from "@/lib/supabase/types";

export type EmployeeJobRole =
  | "PROJECT_MANAGER"
  | "DEVELOPER"
  | "DESIGNER"
  | "CONTENT"
  | "MARKETING"
  | "SALES"
  | "OTHER";

export type EmployeeStatus = "ACTIVE" | "INACTIVE";

export interface TeamMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  role: "SUPER_ADMIN" | "EMPLOYEE" | "CLIENT";
  job_role: EmployeeJobRole;
  status: EmployeeStatus;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  assigned_clients_count: number;
  assigned_clients?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

export interface TeamStats {
  total: number;
  active: number;
  project_managers: number;
  developers: number;
  designers: number;
  other: number;
}

export interface ClientPmHistoryEntry {
  id: string;
  client_id: string;
  previous_pm_id: string | null;
  new_pm_id: string | null;
  previous_pm?: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
  } | null;
  new_pm?: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
  } | null;
  changed_by?: {
    id: string;
    first_name: string;
    last_name: string | null;
  } | null;
  changed_at: string;
  note?: string | null;
}

export interface TeamMemberActionResult {
  success: boolean;
  member?: TeamMember;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface AssignPmActionResult {
  success: boolean;
  message?: string;
  error?: string;
}
