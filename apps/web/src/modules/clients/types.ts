import type { Client, ClientStatus } from "@/lib/supabase/types";
import type { TeamMember } from "@/modules/team/types";

export type { Client, ClientStatus };

export interface ClientWithPm extends Client {
  project_manager_id?: string | null;
  project_manager?: TeamMember | null;
}

export interface ClientFilters {
  query?: string;
  status?: ClientStatus | "ALL";
}

export interface ClientStats {
  total: number;
  active: number;
  paused: number;
  completed: number;
  archived: number;
}

export interface ClientActionResult {
  success: boolean;
  client?: Client;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface PortalAccessActionResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
