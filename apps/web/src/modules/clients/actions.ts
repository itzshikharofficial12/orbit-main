"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  createClientSchema,
  updateClientSchema,
  updateClientStatusSchema,
  inviteClientUserSchema,
} from "./schema";
import type {
  ClientActionResult,
  PortalAccessActionResult,
  Client,
  ClientStatus,
} from "./types";
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

export async function inviteClientUserAction(
  clientId: string,
  formData: FormData
): Promise<PortalAccessActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  const raw = {
    first_name: formData.get("first_name") as string,
    last_name: (formData.get("last_name") as string) || "",
    email: formData.get("email") as string,
  };

  const validation = inviteClientUserSchema.safeParse(raw);
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
    const adminClient = getAdminClient();

    // 1. Check if user profile already exists with this email
    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("id, client_id, email, role")
      .ilike("email", validation.data.email)
      .maybeSingle();

    const existingProfile = rawProfile as unknown as {
      id: string;
      client_id: string | null;
      email: string;
      role: string;
    } | null;

    if (existingProfile) {
      if (existingProfile.client_id === clientId) {
        return {
          success: false,
          error: "A portal user with this email is already connected to this client.",
        };
      }

      // Link profile to this client
      const { error: linkError } = await supabase
        .from("profiles")
        .update({
          client_id: clientId,
          role: "CLIENT",
          first_name: validation.data.first_name,
          last_name: validation.data.last_name || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", existingProfile.id);

      if (linkError) {
        return {
          success: false,
          error: linkError.message || "Failed to link existing user profile.",
        };
      }

      revalidatePath(`/hq/clients/${clientId}`);
      revalidatePath("/hq/clients");

      return {
        success: true,
        message: "Portal access connected to existing account.",
      };
    }

    // 2. If profile does not exist and adminClient is available, invite user
    if (adminClient) {
      const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        validation.data.email,
        {
          data: {
            role: "CLIENT",
            client_id: clientId,
            first_name: validation.data.first_name,
            last_name: validation.data.last_name || null,
          },
          redirectTo: `${env.siteUrl}/set-password`,
        }
      );

      if (inviteError) {
        return {
          success: false,
          error: inviteError.message || "Failed to send invitation email.",
        };
      }

      revalidatePath(`/hq/clients/${clientId}`);
      revalidatePath("/hq/clients");

      return {
        success: true,
        message: `Invitation email sent to ${validation.data.email}.`,
      };
    }

    return {
      success: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY is required in server environment to automatically invite users via Supabase Auth Admin. When the user signs up with this email, Orbit auto-links the account.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function sendClientPasswordResetAction(
  email: string,
  clientId: string
): Promise<PortalAccessActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.siteUrl}/set-password`,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to send password reset email.",
      };
    }

    revalidatePath(`/hq/clients/${clientId}`);

    return {
      success: true,
      message: `Password reset email sent to ${email}.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function unlinkClientUserAction(
  profileId: string,
  clientId: string
): Promise<PortalAccessActionResult> {
  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        client_id: null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", profileId);

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to remove portal access.",
      };
    }

    revalidatePath(`/hq/clients/${clientId}`);
    revalidatePath("/hq/clients");

    return {
      success: true,
      message: "Portal access removed.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return {
      success: false,
      error: message,
    };
  }
}
