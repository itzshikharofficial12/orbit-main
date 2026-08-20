import { notFound, redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getProjectById } from "@/modules/projects/data";
import { getDeliverablesByProjectId } from "@/modules/deliverables/data";
import { getProjectBillingOverview } from "@/modules/payments/data";
import { ProjectDetailHeader } from "@/modules/projects/components/project-detail-header";
import { ProjectOverviewTab } from "@/modules/projects/components/project-overview-tab";
import { ProjectMilestonesTab } from "@/modules/projects/components/project-milestones-tab";
import { ProjectTasksTab } from "@/modules/projects/components/project-tasks-tab";
import { ProjectDeliverablesTab } from "@/modules/deliverables/components/project-deliverables-tab";
import { ProjectBillingTab } from "@/modules/projects/components/project-billing-tab";

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

  const [project, deliverables, billingOverview] = await Promise.all([
    getProjectById(projectId),
    getDeliverablesByProjectId(projectId),
    getProjectBillingOverview(projectId),
  ]);

  if (!project) {
    notFound();
  }

  const activeTab: "overview" | "milestones" | "tasks" | "deliverables" | "billing" =
    tab === "milestones"
      ? "milestones"
      : tab === "tasks"
      ? "tasks"
      : tab === "deliverables"
      ? "deliverables"
      : tab === "billing"
      ? "billing"
      : "overview";

  const totalTasks = project.milestones.reduce(
    (acc, m) => acc + (m.task_count || 0),
    0
  );

  return (
    <OrbitShell
      profile={profile}
      basePath="/hq"
      hideHeader={true}
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

          {activeTab === "billing" && (
            <ProjectBillingTab
              project={project}
              billingOverview={billingOverview}
            />
          )}
        </div>
      </div>
    </OrbitShell>
  );
}
