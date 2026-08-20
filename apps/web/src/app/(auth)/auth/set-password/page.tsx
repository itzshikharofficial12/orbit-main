import { createServerClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { SetPasswordForm } from "@/modules/auth/components/set-password-form";

export const metadata = {
  title: "Set Password — Orbit",
  description: "Set up your Orbit account password.",
};

export const dynamic = "force-dynamic";

interface SetPasswordPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SetPasswordPage(props: SetPasswordPageProps) {
  const searchParams = await props.searchParams;
  const code = typeof searchParams.code === "string" ? searchParams.code : undefined;
  const token_hash = typeof searchParams.token_hash === "string" ? searchParams.token_hash : undefined;
  const type = typeof searchParams.type === "string" ? searchParams.type : undefined;
  const error = typeof searchParams.error === "string" ? searchParams.error : undefined;
  const errorCode = typeof searchParams.error_code === "string" ? searchParams.error_code : undefined;
  const errorDescription = typeof searchParams.error_description === "string" ? searchParams.error_description : undefined;

  let exchangedUserEmail: string | undefined;
  let codeOrOtpError: string | undefined;
  let codeOrOtpErrorDescription: string | undefined;

  // If code or token_hash arrived on /auth/set-password, exchange session on server
  if (code) {
    const supabase = await createServerClient();
    const { data: codeData, error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
    if (!codeErr && codeData.session?.user?.email) {
      exchangedUserEmail = codeData.session.user.email;
    } else if (codeErr) {
      codeOrOtpError = "invalid_or_expired_invitation";
      codeOrOtpErrorDescription = codeErr.message;
    }
  } else if (token_hash && type) {
    const supabase = await createServerClient();
    const { data: otpData, error: otpErr } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });
    if (!otpErr && otpData.session?.user?.email) {
      exchangedUserEmail = otpData.session.user.email;
    } else if (otpErr) {
      codeOrOtpError = "invalid_or_expired_invitation";
      codeOrOtpErrorDescription = otpErr.message;
    }
  }

  const user = await getAuthenticatedUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-background">
      <SetPasswordForm
        initialEmail={user?.email || exchangedUserEmail}
        initialError={errorCode || error || codeOrOtpError}
        initialErrorDescription={errorDescription || codeOrOtpErrorDescription}
      />
    </div>
  );
}
