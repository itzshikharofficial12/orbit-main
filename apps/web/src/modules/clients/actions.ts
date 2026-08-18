"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createClientSchema, updateClientSchema, updateClientStatusSchema } from "./schema";
import type { ClientActionResult, Client, ClientStatus } from "./types";
import type { ClientInsert, ClientUpdate } from "@/lib/supabase/types";
import { env } from "@/lib/env";

export async function createClientAction(formData: FormData): Promise<ClientActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured. Please add your credentials to .env.local.",
    };
  }

  const raw = {
    name: formData.get("name") as string,
    primary_contact_name: formData.get("primary_contact_name") as string,
    primary_contact_email: formData.get("primary_contact_email") as string,
    primary_contact_phone: (formData.get("primary_contact_phone") as string) || "",
    status: (formData.get("status") as string) || "ACTIVE",
    notes: (formData.get("notes") as string) || "",
  };

  const validation = createClientSchema.safeParse(raw);

  if (!validation.success) {
    const fieldErrors: Record<string, string[]> = {};
    validation.error.errors.forEach((err) => {
      const field = err.path.join(".");
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(err.message);
    });

    return {
      success: false,
      error: validation.error.errors[0]?.message || "Validation failed",
      fieldErrors,
    };
  }

  try {
    const supabase = await createServerClient();
    const insertPayload: ClientInsert = {
      name: validation.data.name,
      primary_contact_name: validation.data.primary_contact_name,
      primary_contact_email: validation.data.primary_contact_email,
      primary_contact_phone: validation.data.primary_contact_phone || null,
      status: validation.data.status,
      notes: validation.data.notes || null,
    };

    const { data, error } = await supabase
      .from("clients")
      .insert(insertPayload as never)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to create client in database",
      };
    }

    revalidatePath("/hq/clients");
    revalidatePath("/hq");

    return {
      success: true,
      client: data as Client,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateClientStatusAction(
  clientId: string,
  status: ClientStatus
): Promise<ClientActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const validation = updateClientStatusSchema.safeParse({ clientId, status });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Invalid status",
    };
  }

  try {
    const supabase = await createServerClient();
    const updatePayload: ClientUpdate = {
      status: validation.data.status,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("clients")
      .update(updatePayload as never)
      .eq("id", clientId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to update status",
      };
    }

    revalidatePath("/hq/clients");
    revalidatePath(`/hq/clients/${clientId}`);

    return {
      success: true,
      client: data as Client,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateClientAction(
  clientId: string,
  formData: FormData
): Promise<ClientActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const raw = {
    name: formData.get("name") as string,
    primary_contact_name: formData.get("primary_contact_name") as string,
    primary_contact_email: formData.get("primary_contact_email") as string,
    primary_contact_phone: (formData.get("primary_contact_phone") as string) || "",
    status: (formData.get("status") as string) || "ACTIVE",
    notes: (formData.get("notes") as string) || "",
  };

  const validation = updateClientSchema.safeParse(raw);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Validation failed",
    };
  }

  try {
    const supabase = await createServerClient();
    const updatePayload: ClientUpdate = {
      name: validation.data.name,
      primary_contact_name: validation.data.primary_contact_name,
      primary_contact_email: validation.data.primary_contact_email,
      primary_contact_phone: validation.data.primary_contact_phone || null,
      status: validation.data.status,
      notes: validation.data.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("clients")
      .update(updatePayload as never)
      .eq("id", clientId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to update client details",
      };
    }

    revalidatePath("/hq/clients");
    revalidatePath(`/hq/clients/${clientId}`);

    return {
      success: true,
      client: data as Client,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred";
    return {
      success: false,
      error: message,
    };
  }
}
