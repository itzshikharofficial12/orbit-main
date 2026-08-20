import type {
  ClientRequest as SupabaseClientRequest,
  ClientRequestInsert,
  ClientRequestUpdate,
  ClientRequestStatus,
  ClientRequestPriority,
  Client,
  Project,
  Deliverable,
  Profile,
} from "@/lib/supabase/types";

export type RequestCategory =
  | "GENERAL"
  | "PROJECT"
  | "DELIVERABLE"
  | "PAYMENT"
  | "MEETING"
  | "TECHNICAL"
  | "OTHER";

export type { ClientRequestInsert, ClientRequestUpdate, ClientRequestPriority };

export type RequestStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_CLIENT"
  | "RESOLVED"
  | "CLOSED";

export interface RequestMessage {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  sender?: Pick<Profile, "id" | "first_name" | "last_name" | "email" | "role"> | null;
}

export interface ClientRequest extends Omit<SupabaseClientRequest, "status" | "category"> {
  status: RequestStatus;
  category: RequestCategory | string;
}

export interface ClientRequestWithRelations extends ClientRequest {
  client?: Pick<Client, "id" | "name" | "primary_contact_name" | "primary_contact_email"> | null;
  project?: Pick<Project, "id" | "name" | "service_type" | "status"> | null;
  deliverable?: Pick<Deliverable, "id" | "title" | "status" | "url" | "expected_delivery_date"> | null;
  created_by_profile?: Pick<Profile, "id" | "first_name" | "last_name" | "email" | "role"> | null;
  resolved_by_profile?: Pick<Profile, "id" | "first_name" | "last_name" | "email" | "role"> | null;
  messages?: RequestMessage[];
  messages_count?: number;
}

export interface RequestFilterParams {
  query?: string;
  status?: RequestStatus | "ALL";
  priority?: ClientRequestPriority | "ALL";
  category?: RequestCategory | "ALL";
  clientId?: string | "ALL";
  projectId?: string | "ALL";
}

export interface RequestActionResult<T = ClientRequest> {
  success: boolean;
  request?: T;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface RequestStats {
  total: number;
  open: number;
  inProgress: number;
  waitingForClient: number;
  resolved: number;
  closed: number;
}
