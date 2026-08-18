import { z } from "zod";

export const clientStatusEnum = z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]);

export const createClientSchema = z.object({
  name: z
    .string()
    .min(1, "Client name is required")
    .max(100, "Client name must be 100 characters or fewer")
    .trim(),
  primary_contact_name: z
    .string()
    .min(1, "Primary contact name is required")
    .max(100, "Contact name must be 100 characters or fewer")
    .trim(),
  primary_contact_email: z
    .string()
    .min(1, "Email is required")
    .email("Please provide a valid email address")
    .trim(),
  primary_contact_phone: z
    .string()
    .max(30, "Phone number is too long")
    .optional()
    .or(z.literal("")),
  status: clientStatusEnum.default("ACTIVE"),
  notes: z
    .string()
    .max(1000, "Notes must be 1000 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export const updateClientSchema = z.object({
  name: z
    .string()
    .min(1, "Client name is required")
    .max(100, "Client name must be 100 characters or fewer")
    .trim(),
  primary_contact_name: z
    .string()
    .min(1, "Primary contact name is required")
    .max(100, "Contact name must be 100 characters or fewer")
    .trim(),
  primary_contact_email: z
    .string()
    .min(1, "Email is required")
    .email("Please provide a valid email address")
    .trim(),
  primary_contact_phone: z
    .string()
    .max(30, "Phone number is too long")
    .optional()
    .or(z.literal("")),
  status: clientStatusEnum,
  notes: z
    .string()
    .max(1000, "Notes must be 1000 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export const updateClientStatusSchema = z.object({
  clientId: z.string().uuid("Invalid client identifier"),
  status: clientStatusEnum,
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
