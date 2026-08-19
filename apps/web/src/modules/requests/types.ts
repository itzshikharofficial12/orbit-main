import type {
  ClientRequest,
  ClientRequestInsert,
  ClientRequestUpdate,
  ClientRequestStatus,
  ClientRequestPriority,
  Client,
  Project,
  Deliverable,
  Profile,
} from "@/lib/supabase/types";

export type {
  ClientRequest,
  ClientRequestInsert,
  ClientRequestUpdate,
  ClientRequestStatus,
  ClientRequestPriority,
};

export interface ClientRequestWithRelations extends ClientRequest {
  client?: Pick<Client, "id" | "name" | "primary_contact_name" | "primary_contact_email"> | null;
  project?: Pick<Project, "id" | "name" | "service_type" | "status"> | null;
  deliverable?: Pick<Deliverable, "id" | "title" | "status" | "url" | "expected_delivery_date"> | null;
  created_by_profile?: Pick<Profile, "id" | "first_name" | "last_name" | "email"> | null;
  resolved_by_profile?: Pick<Profile, "id" | "first_name" | "last_name" | "email"> | null;
}

export interface RequestFilterParams {
  query?: string;
  status?: ClientRequestStatus | "ALL";
  priority?: ClientRequestPriority | "ALL";
  clientId?: string | "ALL";
  projectId?: string | "ALL";
}

export interface RequestActionResult {
  success: boolean;
  request?: ClientRequest;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface RequestStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}
