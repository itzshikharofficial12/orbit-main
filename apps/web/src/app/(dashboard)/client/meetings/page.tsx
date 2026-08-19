import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getMeetingsForClient } from "@/modules/meetings/data";
import { ClientMeetingsView } from "@/modules/meetings/components/client-meetings-view";

export const metadata = {
  title: "Meetings — Orbit",
  description: "Scheduled sessions and consultations with Celestia Studios.",
};

export const dynamic = "force-dynamic";

export default async function ClientMeetingsPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/client/meetings");
  }

  if (profile.role === "SUPER_ADMIN") {
    redirect("/hq/meetings");
  }

  const { upcoming, past } = profile.client_id
    ? await getMeetingsForClient(profile.client_id)
    : { upcoming: [], past: [] };

  return (
    <OrbitShell
      profile={profile}
      basePath="/client"
      title="Meetings"
      description="View and join scheduled meetings with Celestia Studios."
    >
      <ClientMeetingsView
        upcomingMeetings={upcoming}
        pastMeetings={past}
      />
    </OrbitShell>
  );
}
