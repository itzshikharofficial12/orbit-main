import { Metadata } from "next";
import { getProjects } from "@/modules/projects/data";
import { getClients } from "@/modules/clients/data";
import { ProjectList } from "@/modules/projects/components/project-list";
import { AddProjectDialog } from "@/modules/projects/components/add-project-dialog";

export const metadata: Metadata = {
  title: "Projects | Orbit HQ",
  description: "Manage active engagements and delivery progress across Celestia Studios.",
};

export const dynamic = "force-dynamic";

export default async function HQProjectsPage() {
  const [projects, clients] = await Promise.all([
    getProjects(),
    getClients({ status: "ALL" }),
  ]);

  const clientOptions = clients.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/40">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage active engagements and delivery progress across Celestia Studios.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AddProjectDialog clients={clientOptions} />
        </div>
      </div>

      {/* Projects Directory List with Filters & Tables */}
      <ProjectList
        initialProjects={projects}
        clients={clientOptions}
        showClientColumn={true}
      />
    </div>
  );
}
