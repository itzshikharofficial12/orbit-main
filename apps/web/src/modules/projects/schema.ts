import { z } from "zod";

export const serviceTypeEnum = z.enum([
  "BRAND_FOUNDATION",
  "SAAS_WEBSITE",
  "GROWTH_ENGINE",
  "AI_OPERATIONS",
]);

export const projectStatusEnum = z.enum([
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "IN_REVIEW",
  "COMPLETED",
  "ARCHIVED",
]);

export const milestoneStatusEnum = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
]);

export const taskStatusEnum = z.enum([
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "COMPLETED",
]);

export const taskPriorityEnum = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

// 1. Project Schemas
export const createProjectSchema = z
  .object({
    name: z
      .string()
      .min(1, "Project name is required")
      .max(120, "Project name must be 120 characters or fewer")
      .trim(),
    client_id: z.string().uuid("Please select a valid client"),
    service_type: serviceTypeEnum,
    description: z
      .string()
      .max(1500, "Description must be 1500 characters or fewer")
      .optional()
      .or(z.literal("")),
    status: projectStatusEnum.default("PLANNING"),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format (YYYY-MM-DD)")
      .optional()
      .or(z.literal("")),
    target_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid target date format (YYYY-MM-DD)")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.start_date && data.target_date) {
        return new Date(data.target_date) >= new Date(data.start_date);
      }
      return true;
    },
    {
      message: "Target date cannot be earlier than start date",
      path: ["target_date"],
    }
  );

export const updateProjectSchema = z
  .object({
    name: z
      .string()
      .min(1, "Project name is required")
      .max(120, "Project name must be 120 characters or fewer")
      .trim(),
    service_type: serviceTypeEnum,
    description: z
      .string()
      .max(1500, "Description must be 1500 characters or fewer")
      .optional()
      .or(z.literal("")),
    status: projectStatusEnum,
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format (YYYY-MM-DD)")
      .optional()
      .or(z.literal("")),
    target_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid target date format (YYYY-MM-DD)")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.start_date && data.target_date) {
        return new Date(data.target_date) >= new Date(data.start_date);
      }
      return true;
    },
    {
      message: "Target date cannot be earlier than start date",
      path: ["target_date"],
    }
  );

export const updateProjectStatusSchema = z.object({
  projectId: z.string().uuid("Invalid project identifier"),
  status: projectStatusEnum,
});

// 2. Milestone Schemas
export const createMilestoneSchema = z.object({
  project_id: z.string().uuid("Invalid project identifier"),
  name: z
    .string()
    .min(1, "Milestone name is required")
    .max(120, "Milestone name must be 120 characters or fewer")
    .trim(),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional()
    .or(z.literal("")),
  status: milestoneStatusEnum.default("NOT_STARTED"),
  position: z.number().int().nonnegative().default(0),
});

export const updateMilestoneSchema = z.object({
  name: z
    .string()
    .min(1, "Milestone name is required")
    .max(120, "Milestone name must be 120 characters or fewer")
    .trim(),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional()
    .or(z.literal("")),
  status: milestoneStatusEnum,
});

export const updateMilestoneStatusSchema = z.object({
  milestoneId: z.string().uuid("Invalid milestone identifier"),
  status: milestoneStatusEnum,
});

// 3. Task Schemas
export const createTaskSchema = z.object({
  milestone_id: z.string().uuid("Invalid milestone identifier"),
  title: z
    .string()
    .min(1, "Task title is required")
    .max(150, "Task title must be 150 characters or fewer")
    .trim(),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional()
    .or(z.literal("")),
  status: taskStatusEnum.default("TODO"),
  priority: taskPriorityEnum.default("MEDIUM"),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid due date format (YYYY-MM-DD)")
    .optional()
    .or(z.literal("")),
  client_visible: z.boolean().default(true),
  position: z.number().int().nonnegative().default(0),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Task title is required")
    .max(150, "Task title must be 150 characters or fewer")
    .trim(),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional()
    .or(z.literal("")),
  status: taskStatusEnum,
  priority: taskPriorityEnum,
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid due date format (YYYY-MM-DD)")
    .optional()
    .or(z.literal("")),
  client_visible: z.boolean(),
});

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid("Invalid task identifier"),
  status: taskStatusEnum,
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
