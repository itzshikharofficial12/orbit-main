"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { loginSchema } from "./schema";
import type { AuthActionResult } from "./types";
import type { Profile } from "@/lib/supabase/types";
import { env } from "@/lib/env";

export async function loginAction(formData: FormData): Promise<AuthActionResult | void> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validation = loginSchema.safeParse({ email, password });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Invalid input",
    };
  }

  if (!env.isConfigured()) {
    return {
      success: false,
      error: "Supabase connection is not configured. Please add your credentials in .env.local.",
    };
  }

  let redirectTo = "/hq";

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Invalid email or password",
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: "Authentication failed. Please try again.",
      };
    }

    // Determine target route from profile or metadata
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    const role = (profile as { role?: Profile["role"] } | null)?.role || data.user.user_metadata?.role || "SUPER_ADMIN";
    redirectTo = role === "CLIENT" ? "/client" : "/hq";
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected authentication error occurred";
    return {
      success: false,
      error: message,
    };
  }

  redirect(redirectTo);
}

export async function signOutAction() {
  if (env.isConfigured()) {
    const supabase = await createServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
