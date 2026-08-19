import { z } from "zod";

export const createMeetingSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Meeting title is required")
      .max(200, "Title cannot exceed 200 characters"),
    client_id: z
      .string()
      .uuid("A valid client must be selected"),
    project_id: z
      .string()
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 && val !== "NONE" ? val : null)),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be formatted as YYYY-MM-DD"),
    start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Start time must be formatted as HH:MM"),
    end_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "End time must be formatted as HH:MM"),
    meeting_url: z
      .string()
      .trim()
      .min(1, "Meeting URL is required")
      .url("Meeting URL must be a valid web address (e.g. https://meet.google.com/...)"),
    description: z
      .string()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  })
  .refine(
    (data) => {
      const startDateTime = new Date(`${data.date}T${data.start_time.slice(0, 5)}:00`);
      const endDateTime = new Date(`${data.date}T${data.end_time.slice(0, 5)}:00`);
      return endDateTime > startDateTime;
    },
    {
      message: "End time must be later than start time",
      path: ["end_time"],
    }
  );

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

export const updateMeetingSchema = z
  .object({
    meeting_id: z.string().uuid("Invalid meeting ID"),
    title: z
      .string()
      .trim()
      .min(1, "Meeting title is required")
      .max(200, "Title cannot exceed 200 characters"),
    client_id: z
      .string()
      .uuid("A valid client must be selected"),
    project_id: z
      .string()
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 && val !== "NONE" ? val : null)),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be formatted as YYYY-MM-DD"),
    start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Start time must be formatted as HH:MM"),
    end_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "End time must be formatted as HH:MM"),
    meeting_url: z
      .string()
      .trim()
      .min(1, "Meeting URL is required")
      .url("Meeting URL must be a valid web address"),
    description: z
      .string()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  })
  .refine(
    (data) => {
      const startDateTime = new Date(`${data.date}T${data.start_time.slice(0, 5)}:00`);
      const endDateTime = new Date(`${data.date}T${data.end_time.slice(0, 5)}:00`);
      return endDateTime > startDateTime;
    },
    {
      message: "End time must be later than start time",
      path: ["end_time"],
    }
  );

export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;

export const cancelMeetingSchema = z.object({
  meeting_id: z.string().uuid("Invalid meeting ID"),
});

export const completeMeetingSchema = z.object({
  meeting_id: z.string().uuid("Invalid meeting ID"),
});
