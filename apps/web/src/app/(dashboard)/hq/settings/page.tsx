import { redirect } from "next/navigation";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getProfileAndPreferences } from "@/modules/profile/data";
import { ProfileSettingsView } from "@/modules/profile/components/profile-settings-view";

export const metadata = {
  title: "Profile & Settings — Orbit HQ",
  description: "Manage your Celestia Studios HQ profile, credentials, and preferences.",
};

export const dynamic = "force-dynamic";

export default async function HqSettingsPage() {
  const data = await getProfileAndPreferences();

  if (!data) {
    redirect("/login?redirect=/hq/settings");
  }

  // Prevent CLIENT role from accessing HQ settings
  if (data.profile.role === "CLIENT") {
    redirect("/client/settings");
  }

  return (
    <OrbitShell
      profile={data.profile}
      basePath="/hq"
      title="Profile & Settings"
      description="Manage your account profile, security credentials, and notification preferences."
    >
      <ProfileSettingsView initialData={data} basePath="/hq" />
    </OrbitShell>
  );
}
