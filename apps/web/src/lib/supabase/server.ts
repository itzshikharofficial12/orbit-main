import { createServerClient as createSupabaseServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database, Profile } from "./types";
import { env } from "@/lib/env";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component cookie set ignore
          }
        },
      },
    }
  );
}

export async function getAuthenticatedUser() {
  if (!env.isConfigured()) {
    return null;
  }

  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getAuthenticatedProfile(): Promise<Profile | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  if (!env.isConfigured()) return null;

  const supabase = await createServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    const meta = user.user_metadata || {};
    const firstName = meta.first_name || meta.full_name?.split(" ")[0] || user.email?.split("@")[0] || "User";
    const lastName = meta.last_name || (meta.full_name ? meta.full_name.split(" ").slice(1).join(" ") : null);
    const role = (meta.role as Profile["role"]) || "SUPER_ADMIN";
    const clientId = meta.client_id || null;
    const avatarUrl = meta.avatar_url || null;

    return {
      id: user.id,
      email: user.email || "",
      first_name: firstName,
      last_name: lastName,
      role: role,
      client_id: clientId,
      avatar_url: avatarUrl,
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at,
    };
  }

  return profile as Profile;
}
