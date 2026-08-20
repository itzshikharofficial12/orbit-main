import { redirect } from "next/navigation";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getProfileAndPreferences } from "@/modules/profile/data";
import { ProfileSettingsView } from "@/modules/profile/components/profile-settings-view";

export const metadata = {
  title: "Profile & Settings — Orbit Client Portal",
  description: "Manage your client account profile, security credentials, and preferences.",
};

export const dynamic = "force-dynamic";

export default async function ClientSettingsPage() {
  const data = await getProfileAndPreferences();

  if (!data) {
    redirect("/login?redirect=/client/settings");
  }

  // Prevent SUPER_ADMIN from accessing Client settings
  if (data.profile.role === "SUPER_ADMIN") {
    redirect("/hq/settings");
  }

  return (
    <OrbitShell
      profile={data.profile}
      basePath="/client"
      title="Profile & Settings"
      description="Manage your client profile, security credentials, and workspace preferences."
    >
      <ProfileSettingsView initialData={data} basePath="/client" />
    </OrbitShell>
  );
}
