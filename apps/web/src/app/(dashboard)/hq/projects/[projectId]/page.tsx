import { notFound, redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getProjectById } from "@/modules/projects/data";
import { getDeliverablesByProjectId } from "@/modules/deliverables/data";
import { ProjectDetailHeader } from "@/modules/projects/components/project-detail-header";
import { ProjectOverviewTab } from "@/modules/projects/components/project-overview-tab";
import { ProjectMilestonesTab } from "@/modules/projects/components/project-milestones-tab";
import { ProjectTasksTab } from "@/modules/projects/components/project-tasks-tab";
import { ProjectDeliverablesTab } from "@/modules/deliverables/components/project-deliverables-tab";

interface PageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    return {
      title: "Project Not Found — Orbit",
    };
  }

  return {
    title: `${project.name} — Projects | Orbit`,
    description: `Project engagement workspace for ${project.name} at Celestia Studios.`,
  };
}

export const dynamic = "force-dynamic";

export default async function HQProjectDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { projectId } = await params;
  const { tab } = await searchParams;

  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect(`/login?redirect=/hq/projects/${projectId}`);
  }

  if (profile.role === "CLIENT") {
    redirect("/client");
  }

  const [project, deliverables] = await Promise.all([
    getProjectById(projectId),
    getDeliverablesByProjectId(projectId),
  ]);

  if (!project) {
    notFound();
  }

  const activeTab: "overview" | "milestones" | "tasks" | "deliverables" =
    tab === "milestones"
      ? "milestones"
      : tab === "tasks"
      ? "tasks"
      : tab === "deliverables"
      ? "deliverables"
      : "overview";

  const totalTasks = project.milestones.reduce(
    (acc, m) => acc + (m.task_count || 0),
    0
  );

  return (
    <OrbitShell
      profile={profile}
      basePath="/hq"
      title={project.name}
      description="Project engagement workspace."
    >
      <div className="space-y-8">
        {/* Project Workspace Header with Metrics and Tabs */}
        <ProjectDetailHeader
          project={project}
          activeTab={activeTab}
          milestoneCount={project.milestone_count}
          taskCount={totalTasks}
          deliverableCount={deliverables.length}
        />

        {/* Tab Content Display */}
        <div className="pt-2">
          {activeTab === "overview" && (
            <ProjectOverviewTab
              project={project}
              deliverables={deliverables}
            />
          )}

          {activeTab === "milestones" && (
            <ProjectMilestonesTab project={project} />
          )}

          {activeTab === "tasks" && (
            <ProjectTasksTab project={project} />
          )}

          {activeTab === "deliverables" && (
            <ProjectDeliverablesTab
              projectId={project.id}
              deliverables={deliverables}
              milestones={project.milestones}
            />
          )}
        </div>
      </div>
    </OrbitShell>
  );
}
