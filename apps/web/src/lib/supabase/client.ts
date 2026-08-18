import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { env } from "@/lib/env";

export function createBrowserClient() {
  return createSupabaseBrowserClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey
  );
}
