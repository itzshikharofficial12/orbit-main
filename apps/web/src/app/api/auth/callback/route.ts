import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  const isPasswordSetupFlow = type === "invite" || type === "recovery";
  const defaultNext = isPasswordSetupFlow ? "/set-password" : "/";
  const next = searchParams.get("next") ?? defaultNext;

  if (error || errorCode) {
    const errorParam = errorCode || error || "auth_callback_failed";
    const descParam = errorDescription || "";
    const target = isPasswordSetupFlow ? "/set-password" : "/login";
    return NextResponse.redirect(
      `${origin}${target}?error=${encodeURIComponent(errorParam)}&error_description=${encodeURIComponent(descParam)}`
    );
  }

  const targetPath = next.startsWith("/") ? next : `/${next}`;
  const supabase = await createServerClient();

  if (code) {
    const { error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
    if (!codeErr) {
      return NextResponse.redirect(`${origin}${targetPath}`);
    }
    const fallback = isPasswordSetupFlow
      ? `/set-password?error=invalid_or_expired_invitation&error_description=${encodeURIComponent(codeErr.message)}`
      : `/login?error=auth_callback_failed&error_description=${encodeURIComponent(codeErr.message)}`;
    return NextResponse.redirect(`${origin}${fallback}`);
  }

  if (token_hash && type) {
    const { error: otpErr } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!otpErr) {
      return NextResponse.redirect(`${origin}${targetPath}`);
    }
    const fallback = isPasswordSetupFlow
      ? `/set-password?error=invalid_or_expired_invitation&error_description=${encodeURIComponent(otpErr.message)}`
      : `/login?error=auth_callback_failed&error_description=${encodeURIComponent(otpErr.message)}`;
    return NextResponse.redirect(`${origin}${fallback}`);
  }

  // If parameters are missing in searchParams (e.g. fragment token flow), forward cleanly to targetPath
  return NextResponse.redirect(`${origin}${targetPath}`);
}
