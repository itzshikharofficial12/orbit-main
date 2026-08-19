import { z } from "zod";

export const clientRequestPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const clientRequestStatusEnum = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);

export const createChangeRequestSchema = z.object({
  projectId: z.string().uuid("Invalid project identifier"),
  deliverableId: z.string().uuid("Invalid deliverable identifier"),
  title: z
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(200, "Subject must be less than 200 characters")
    .trim(),
  description: z
    .string()
    .min(5, "Description must be at least 5 characters")
    .max(5000, "Description must be less than 5000 characters")
    .trim(),
  priority: clientRequestPriorityEnum.default("MEDIUM"),
});

export const updateRequestStatusSchema = z.object({
  requestId: z.string().uuid("Invalid request identifier"),
  status: clientRequestStatusEnum,
});

export type CreateChangeRequestInput = z.infer<typeof createChangeRequestSchema>;
export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>;
