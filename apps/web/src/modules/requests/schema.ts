import { z } from "zod";

export const requestCategoryEnum = z.enum([
  "GENERAL",
  "PROJECT",
  "DELIVERABLE",
  "PAYMENT",
  "MEETING",
  "TECHNICAL",
  "OTHER",
]);

export const requestPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const requestStatusEnum = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CLIENT",
  "RESOLVED",
  "CLOSED",
]);

export const createClientRequestSchema = z.object({
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
  category: requestCategoryEnum.default("GENERAL"),
  priority: requestPriorityEnum.default("MEDIUM"),
  projectId: z.string().uuid("Invalid project identifier").optional().nullable(),
  deliverableId: z.string().uuid("Invalid deliverable identifier").optional().nullable(),
  paymentId: z.string().uuid("Invalid payment identifier").optional().nullable(),
  meetingId: z.string().uuid("Invalid meeting identifier").optional().nullable(),
  scheduleItemId: z.string().uuid("Invalid schedule item identifier").optional().nullable(),
});

export const createChangeRequestSchema = z.object({
  projectId: z.string().uuid("Invalid project identifier").optional().nullable(),
  deliverableId: z.string().uuid("Invalid deliverable identifier").optional().nullable(),
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
  priority: requestPriorityEnum.default("MEDIUM"),
});

export const sendRequestMessageSchema = z.object({
  requestId: z.string().uuid("Invalid request identifier"),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message cannot exceed 5000 characters")
    .trim(),
});

export const updateRequestStatusSchema = z.object({
  requestId: z.string().uuid("Invalid request identifier"),
  status: requestStatusEnum,
  resolutionNotes: z.string().max(2000).optional(),
});

export const updateRequestPrioritySchema = z.object({
  requestId: z.string().uuid("Invalid request identifier"),
  priority: requestPriorityEnum,
});

export type CreateClientRequestInput = z.infer<typeof createClientRequestSchema>;
export type CreateChangeRequestInput = z.infer<typeof createChangeRequestSchema>;
export type SendRequestMessageInput = z.infer<typeof sendRequestMessageSchema>;
export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>;
export type UpdateRequestPriorityInput = z.infer<typeof updateRequestPrioritySchema>;
