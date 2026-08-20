import { z } from "zod";

export const updateProfileSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(60, "First name must be 60 characters or fewer"),
  last_name: z
    .string()
    .trim()
    .max(60, "Last name must be 60 characters or fewer")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number must be 30 characters or fewer")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  job_role: z
    .enum([
      "PROJECT_MANAGER",
      "DEVELOPER",
      "DESIGNER",
      "CONTENT",
      "MARKETING",
      "SALES",
      "OTHER",
    ])
    .optional()
    .nullable(),
  department: z
    .string()
    .trim()
    .max(60, "Department must be 60 characters or fewer")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  bio: z
    .string()
    .trim()
    .max(500, "Bio must be 500 characters or fewer")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z
      .string()
      .min(1, "Current password is required"),
    new_password: z
      .string()
      .min(1, "New password is required")
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be 100 characters or fewer"),
    confirm_new_password: z
      .string()
      .min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: "New passwords do not match",
    path: ["confirm_new_password"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updatePreferencesSchema = z.object({
  in_app_notifications: z.boolean().default(true),
  notification_sound: z.boolean().default(true),
  email_notifications: z.boolean().default(true),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
