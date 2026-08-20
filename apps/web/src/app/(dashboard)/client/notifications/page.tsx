import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { ClientNotificationsPageView } from "@/modules/notifications/components/client-notifications-page-view";

export const metadata = {
  title: "Notifications — Orbit",
  description: "Updates and actions from your Celestia Studios workspace.",
};

export const dynamic = "force-dynamic";

export default async function ClientNotificationsPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/client/notifications");
  }

  if (profile.role === "SUPER_ADMIN") {
    redirect("/hq");
  }

  return (
    <OrbitShell
      profile={profile}
      basePath="/client"
      title="Notifications"
      description="Updates and actions from your Celestia Studios workspace."
    >
      <ClientNotificationsPageView />
    </OrbitShell>
  );
}
