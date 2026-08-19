import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getProjects } from "@/modules/projects/data";
import { getClients } from "@/modules/clients/data";
import { ProjectList } from "@/modules/projects/components/project-list";
import { AddProjectDialog } from "@/modules/projects/components/add-project-dialog";

export const metadata = {
  title: "Projects — Orbit",
  description: "Manage active engagements and delivery progress across Celestia Studios.",
};

export const dynamic = "force-dynamic";

export default async function HQProjectsPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/hq/projects");
  }

  if (profile.role === "CLIENT") {
    redirect("/client");
  }

  const [projects, clients] = await Promise.all([
    getProjects(),
    getClients({ status: "ALL" }),
  ]);

  const clientOptions = clients.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <OrbitShell
      profile={profile}
      basePath="/hq"
      title="Projects"
      description="Manage active engagements and delivery progress across Celestia Studios."
      actions={<AddProjectDialog clients={clientOptions} />}
    >
      <ProjectList
        initialProjects={projects}
        clients={clientOptions}
        showClientColumn={true}
      />
    </OrbitShell>
  );
}
