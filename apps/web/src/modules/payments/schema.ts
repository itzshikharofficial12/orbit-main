import { z } from "zod";

export const scheduleItemInputSchema = z.object({
  title: z.string().trim().min(1, "Schedule item title is required"),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  due_date: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  milestone_id: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 && val !== "NONE" ? val.trim() : null)),
  recurrence_reference: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
});

export const createBillingPlanSchema = z.object({
  client_id: z.string().uuid("A valid client must be selected"),
  project_id: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 && val !== "NONE" ? val.trim() : null)),
  name: z
    .string()
    .trim()
    .min(1, "Plan name is required")
    .max(200, "Plan name cannot exceed 200 characters"),
  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  billing_type: z.enum([
    "ONE_TIME",
    "INSTALLMENTS",
    "RECURRING",
    "MILESTONE",
    "CUSTOM",
    "HYBRID",
  ]),
  total_contract_value: z.coerce
    .number()
    .min(0, "Total contract value must be a positive number"),
  currency: z.string().default("INR"),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be formatted as YYYY-MM-DD"),
  end_date: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  schedule_items: z
    .array(scheduleItemInputSchema)
    .min(1, "At least one schedule item is required"),
});

export type CreateBillingPlanInput = z.input<typeof createBillingPlanSchema>;
export type CreateBillingPlanOutput = z.infer<typeof createBillingPlanSchema>;

export const recordManualPaymentSchema = z.object({
  client_id: z.string().uuid("Valid client ID is required"),
  project_id: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 && val !== "NONE" ? val.trim() : null)),
  billing_schedule_item_id: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 && val !== "NONE" ? val.trim() : null)),
  amount: z.coerce.number().positive("Payment amount must be greater than 0"),
  currency: z.string().default("INR"),
  transaction_reference: z
    .string()
    .trim()
    .min(1, "Transaction / UTR reference number is required for bank transfer"),
  paid_at: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : new Date().toISOString())),
  notes: z
    .string()
    .max(2000, "Notes cannot exceed 2000 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
});

export type RecordManualPaymentInput = z.infer<typeof recordManualPaymentSchema>;

export const updateBillingPlanStatusSchema = z.object({
  plan_id: z.string().uuid("Invalid plan ID"),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]),
});
