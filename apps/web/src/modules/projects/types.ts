import type {
  Project,
  ServiceType,
  ProjectStatus,
  Milestone,
  MilestoneStatus,
  Task,
  TaskStatus,
  TaskPriority,
  Client,
} from "@/lib/supabase/types";

export type {
  Project,
  ServiceType,
  ProjectStatus,
  Milestone,
  MilestoneStatus,
  Task,
  TaskStatus,
  TaskPriority,
  Client,
};

export interface ProjectWithClient extends Project {
  client?: Pick<Client, "id" | "name" | "status" | "primary_contact_name" | "primary_contact_email">;
  milestone_count: number;
  completed_milestone_count: number;
  progress: number;
}

export interface MilestoneWithTasks extends Milestone {
  tasks: Task[];
  task_count: number;
  completed_task_count: number;
}

export interface ProjectDetails extends ProjectWithClient {
  milestones: MilestoneWithTasks[];
}

export interface ProjectFilters {
  query?: string;
  clientId?: string;
  serviceType?: ServiceType | "ALL";
  status?: ProjectStatus | "ALL";
}

export interface ProjectStats {
  total: number;
  active: number;
  planning: number;
  in_review: number;
  on_hold: number;
  completed: number;
  archived: number;
}

export interface ProjectActionResult<T = Project> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
