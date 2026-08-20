import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsProfileRedirectPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/settings/profile");
  }

  if (profile.role === "CLIENT") {
    redirect("/client/settings");
  }

  redirect("/hq/settings");
}
