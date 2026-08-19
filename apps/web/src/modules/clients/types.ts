import type { Client, ClientStatus } from "@/lib/supabase/types";

export type { Client, ClientStatus };

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
