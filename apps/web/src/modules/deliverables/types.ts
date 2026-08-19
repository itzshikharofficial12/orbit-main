import type {
  Deliverable,
  DeliverableInsert,
  DeliverableUpdate,
  DeliverableStatus,
  Milestone,
  Profile,
} from "@/lib/supabase/types";

export type { Deliverable, DeliverableInsert, DeliverableUpdate, DeliverableStatus };

export interface DeliverableWithMilestone extends Deliverable {
  milestone?: Pick<Milestone, "id" | "name"> | null;
  approved_by_profile?: Pick<Profile, "id" | "first_name" | "last_name"> | null;
  changes_requested_by_profile?: Pick<Profile, "id" | "first_name" | "last_name"> | null;
}

export interface DeliverableActionResult {
  success: boolean;
  deliverable?: Deliverable;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
