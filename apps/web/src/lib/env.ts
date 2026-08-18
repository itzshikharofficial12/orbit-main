import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY must not be empty"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional().default("http://localhost:3000"),
});

const clientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};

export function getEnv() {
  const parsed = envSchema.safeParse(clientEnv);

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error(
      "Invalid environment variables. Please check your .env.local file."
    );
  }

  return parsed.data;
}

export const env = {
  get supabaseUrl(): string {
    return process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  },
  get supabaseAnonKey(): string {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  },
  get siteUrl(): string {
    return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  },
  isConfigured(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    const isPlaceholderUrl =
      url.includes("your-project") ||
      url.includes("placeholder-project") ||
      url.includes("example.com") ||
      url === "";

    const isPlaceholderKey =
      key.includes("your-") ||
      key.includes("placeholder") ||
      key === "";

    return Boolean(url && key && !isPlaceholderUrl && !isPlaceholderKey);
  },
};
