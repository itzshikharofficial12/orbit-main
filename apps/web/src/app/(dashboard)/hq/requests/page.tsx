import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getAllRequestsForAdmin } from "@/modules/requests/data";
import { getClients } from "@/modules/clients/data";
import { getProjects } from "@/modules/projects/data";
import { AdminRequestsDirectory } from "@/modules/requests/components/admin-requests-directory";

export const metadata = {
  title: "Requests — Orbit HQ",
  description: "Client change requests and deliverable revision directory.",
};

export const dynamic = "force-dynamic";

export default async function HqRequestsPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/hq/requests");
  }

  if (profile.role === "CLIENT") {
    redirect("/client");
  }

  const [requests, clients, projects] = await Promise.all([
    getAllRequestsForAdmin(),
    getClients(),
    getProjects(),
  ]);

  return (
    <OrbitShell
      profile={profile}
      basePath="/hq"
      title="Request Directory"
      description="Manage client change requests, revision feedback, and resolution workflows."
    >
      <AdminRequestsDirectory
        initialRequests={requests}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />
    </OrbitShell>
  );
}
