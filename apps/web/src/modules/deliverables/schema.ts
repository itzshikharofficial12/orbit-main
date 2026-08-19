import { z } from "zod";

export const deliverableStatusEnum = z.enum([
  "PLANNED",
  "IN_PROGRESS",
  "READY_FOR_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "ARCHIVED",
]);

export const createDeliverableSchema = z.object({
  title: z
    .string()
    .min(1, "Deliverable title is required")
    .max(200, "Title must be 200 characters or fewer")
    .trim(),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional()
    .nullable()
    .transform((v) => (v ? v.trim() : null)),
  milestone_id: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  status: deliverableStatusEnum.default("PLANNED"),
  expected_delivery_date: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  url: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null))
    .refine(
      (val) => {
        if (!val) return true;
        try {
          const parsed = new URL(val);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Please enter a valid URL (including https://)" }
    ),
  client_visible: z.boolean().default(true),
  notes: z
    .string()
    .max(2000, "Notes must be 2000 characters or fewer")
    .optional()
    .nullable()
    .transform((v) => (v ? v.trim() : null)),
});

export const updateDeliverableSchema = createDeliverableSchema.extend({
  id: z.string().uuid("Invalid deliverable ID"),
});

export const submitDeliverableSchema = z.object({
  id: z.string().uuid("Invalid deliverable ID"),
  url: z
    .string()
    .min(1, "Delivery URL or preview link is required to submit for review")
    .refine(
      (val) => {
        try {
          const parsed = new URL(val);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Please enter a valid URL (including https://)" }
    ),
  expected_delivery_date: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
});

export const requestChangesSchema = z.object({
  id: z.string().uuid("Invalid deliverable ID"),
  feedback: z
    .string()
    .min(3, "Please describe the changes requested (at least 3 characters)")
    .max(2000, "Feedback must be 2000 characters or fewer")
    .trim(),
});

export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>;
export type SubmitDeliverableInput = z.infer<typeof submitDeliverableSchema>;
export type RequestChangesInput = z.infer<typeof requestChangesSchema>;
