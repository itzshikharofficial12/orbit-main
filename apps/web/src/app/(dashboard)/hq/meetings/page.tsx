import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getMeetingsForAdmin } from "@/modules/meetings/data";
import { getClients } from "@/modules/clients/data";
import { getProjects } from "@/modules/projects/data";
import { AdminMeetingsDirectory } from "@/modules/meetings/components/admin-meetings-directory";
import { AddMeetingDialog } from "@/modules/meetings/components/add-meeting-dialog";

export const metadata = {
  title: "Meetings — Orbit",
  description: "Manage upcoming and past client meetings.",
};

export const dynamic = "force-dynamic";

export default async function HqMeetingsPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/hq/meetings");
  }

  if (profile.role !== "SUPER_ADMIN") {
    redirect("/client");
  }

  const [{ upcoming, past }, clients, projects] = await Promise.all([
    getMeetingsForAdmin(),
    getClients(),
    getProjects(),
  ]);

  return (
    <OrbitShell
      profile={profile}
      basePath="/hq"
      title="Meetings"
      description="Manage upcoming and past client meetings."
      actions={<AddMeetingDialog clients={clients} projects={projects} />}
    >
      <AdminMeetingsDirectory
        upcomingMeetings={upcoming}
        pastMeetings={past}
        clients={clients}
        projects={projects}
      />
    </OrbitShell>
  );
}
