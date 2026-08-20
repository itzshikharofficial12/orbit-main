import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/set-password";
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  // 1. If Supabase passed an error directly in search params
  if (error || errorCode) {
    const errorParam = errorCode || error || "invalid_or_expired_invitation";
    const descParam = errorDescription || "";
    return NextResponse.redirect(
      `${origin}/set-password?error=${encodeURIComponent(errorParam)}&error_description=${encodeURIComponent(descParam)}`
    );
  }

  const targetPath = next.startsWith("/") ? next : `/${next}`;
  const supabase = await createServerClient();

  // 2. PKCE Auth Code flow
  if (code) {
    const { error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
    if (!codeErr) {
      return NextResponse.redirect(`${origin}${targetPath}`);
    } else {
      console.warn("Notice: exchangeCodeForSession failed:", codeErr.message);
      return NextResponse.redirect(
        `${origin}/set-password?error=invalid_or_expired_invitation&error_description=${encodeURIComponent(codeErr.message)}`
      );
    }
  }

  // 3. Email OTP / Token Hash flow (type = invite | recovery | signup | email | magiclink)
  if (token_hash && type) {
    const { error: otpErr } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!otpErr) {
      return NextResponse.redirect(`${origin}${targetPath}`);
    } else {
      console.warn("Notice: verifyOtp failed:", otpErr.message);
      return NextResponse.redirect(
        `${origin}/set-password?error=invalid_or_expired_invitation&error_description=${encodeURIComponent(otpErr.message)}`
      );
    }
  }

  // 4. If verification parameters are not in searchParams, redirect to targetPath.
  // Do NOT inject ?error=invalid_or_expired_invitation because Supabase implicit flow
  // provides tokens in the client URL fragment (#access_token=...) which is only accessible to the browser.
  return NextResponse.redirect(`${origin}${targetPath}`);
}
