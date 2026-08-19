import { getAuthenticatedUser } from "@/lib/supabase/server";
import { SetPasswordForm } from "@/modules/auth/components/set-password-form";

export const metadata = {
  title: "Set Password — Orbit",
  description: "Set up your Orbit account password.",
};

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const user = await getAuthenticatedUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-background">
      <SetPasswordForm initialEmail={user?.email} />
    </div>
  );
}
