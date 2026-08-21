import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY must not be empty"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional().default("http://localhost:3001"),
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
    return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  },
  get razorpayKeyId(): string {
    return process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  },
  get razorpayKeySecret(): string {
    return process.env.RAZORPAY_KEY_SECRET || "";
  },
  get razorpayWebhookSecret(): string {
    return process.env.RAZORPAY_WEBHOOK_SECRET || "";
  },
  get nextPublicRazorpayKeyId(): string {
    return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
  },
  isRazorpayConfigured(): boolean {
    const keyId = this.razorpayKeyId;
    const keySecret = this.razorpayKeySecret;
    const isPlaceholder =
      keyId.includes("your_") ||
      keyId.includes("placeholder") ||
      keySecret.includes("your_") ||
      keySecret.includes("placeholder");
    return Boolean(keyId && keySecret && !isPlaceholder);
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

/**
 * Resolves the canonical application URL dynamically.
 * In server actions or request handlers, inspects incoming request headers.
 * Otherwise falls back to NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_VERCEL_URL.
 */
export async function getCanonicalAppUrl(): Promise<string> {
  // 1. Authoritative production/custom domain environment variable
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (
    configuredUrl &&
    !configuredUrl.includes("placeholder") &&
    !configuredUrl.includes("localhost") &&
    !configuredUrl.includes("127.0.0.1")
  ) {
    return configuredUrl.replace(/\/$/, "");
  }

  // 2. In server actions / request context, inspect incoming headers
  try {
    const { headers } = await import("next/headers");
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host");
    const proto =
      headerList.get("x-forwarded-proto") ||
      (host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https");
    if (host) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  } catch {
    // headers() throws if called outside a request context
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  if (configuredUrl && !configuredUrl.includes("placeholder")) {
    return configuredUrl.replace(/\/$/, "");
  }

  return "http://localhost:3001";
}
