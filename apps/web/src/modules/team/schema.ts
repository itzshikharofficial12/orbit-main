import { z } from "zod";

export const employeeJobRoleEnum = z.enum([
  "PROJECT_MANAGER",
  "DEVELOPER",
  "DESIGNER",
  "CONTENT",
  "MARKETING",
  "SALES",
  "OTHER",
]);

export const employeeStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);

export const createTeamMemberSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name is too long"),
  last_name: z
    .string()
    .trim()
    .max(100, "Last name is too long")
    .optional()
    .nullable(),
  email: z
    .string()
    .trim()
    .min(1, "Work email is required")
    .email("Please enter a valid work email address"),
  job_role: employeeJobRoleEnum,
  department: z.string().trim().max(100, "Department name is too long").optional().nullable(),
  is_project_manager: z.boolean().optional().default(false),
  status: employeeStatusEnum.default("ACTIVE"),
  phone: z
    .string()
    .trim()
    .max(25, "Phone number is too long")
    .optional()
    .nullable(),
});

export const updateTeamMemberSchema = z.object({
  id: z.string().uuid("Invalid member ID"),
  first_name: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name is too long"),
  last_name: z
    .string()
    .trim()
    .max(100, "Last name is too long")
    .optional()
    .nullable(),
  job_role: employeeJobRoleEnum,
  department: z.string().trim().max(100, "Department name is too long").optional().nullable(),
  is_project_manager: z.boolean().optional().default(false),
  status: employeeStatusEnum,
  phone: z
    .string()
    .trim()
    .max(25, "Phone number is too long")
    .optional()
    .nullable(),
});

export const assignProjectManagerSchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  project_manager_id: z
    .string()
    .uuid("Invalid Project Manager ID")
    .nullable()
    .optional(),
  note: z.string().max(500, "Note is too long").optional().nullable(),
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type AssignProjectManagerInput = z.infer<typeof assignProjectManagerSchema>;
