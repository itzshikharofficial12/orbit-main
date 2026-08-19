import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/set-password";

  const targetPath = next.startsWith("/") ? next : `/${next}`;
  const supabase = await createServerClient();

  // 1. PKCE Auth Code flow
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${targetPath}`);
    }
  }

  // 2. Email OTP / Token Hash flow (type = invite | recovery | signup | email)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${targetPath}`);
    }
  }

  // If verification fails or parameters are missing, redirect to set-password with error
  return NextResponse.redirect(`${origin}/set-password?error=invalid_or_expired_invitation`);
}
