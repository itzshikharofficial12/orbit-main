import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { env } from "@/lib/env";

let browserClient: ReturnType<typeof createSupabaseBrowserClient<Database>> | undefined;

export function createBrowserClient() {
  if (typeof window === "undefined") {
    return createSupabaseBrowserClient<Database>(
      env.supabaseUrl,
      env.supabaseAnonKey
    );
  }

  if (!browserClient) {
    browserClient = createSupabaseBrowserClient<Database>(
      env.supabaseUrl,
      env.supabaseAnonKey
    );
  }

  return browserClient;
}
