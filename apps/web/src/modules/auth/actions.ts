"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
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

  let redirectTo = "/login";

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

    // Authoritatively resolve role from database profile using adminClient
    const adminClient = getAdminClient();
    const dbClient = (adminClient || supabase) as any;

    const { data: profile } = await dbClient
      .from("profiles")
      .select("role, client_id")
      .eq("id", data.user.id)
      .maybeSingle();

    const role: Profile["role"] =
      (profile?.role as Profile["role"]) ||
      (data.user.user_metadata?.role as Profile["role"]) ||
      "CLIENT";

    if (role === "CLIENT") {
      redirectTo = "/client";
    } else if (role === "SUPER_ADMIN" || role === "EMPLOYEE") {
      redirectTo = "/hq";
    } else {
      redirectTo = "/login";
    }

    // Sync auth metadata if missing or mismatched
    if (adminClient && (!data.user.user_metadata?.role || data.user.user_metadata.role !== role)) {
      try {
        await adminClient.auth.admin.updateUserById(data.user.id, {
          user_metadata: {
            ...data.user.user_metadata,
            role: role,
            client_id: profile?.client_id || data.user.user_metadata?.client_id || null,
          },
        });
      } catch (syncErr) {
        console.warn("Notice syncing user metadata:", syncErr);
      }
    }
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
    try {
      const supabase = await createServerClient();
      await supabase.auth.signOut({ scope: "global" });
    } catch (err) {
      console.warn("Notice signing out from supabase:", err);
    }
  }

  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    allCookies.forEach((c) => {
      if (
        c.name.includes("supabase") ||
        c.name.includes("sb-") ||
        c.name.includes("auth-token")
      ) {
        cookieStore.delete(c.name);
      }
    });
  } catch {
    // Ignore cookie deletion errors in Server Component context
  }

  redirect("/login");
}
