import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjectById } from "@/modules/projects/data";
import { ProjectDetailHeader } from "@/modules/projects/components/project-detail-header";
import { ProjectOverviewTab } from "@/modules/projects/components/project-overview-tab";
import { ProjectMilestonesTab } from "@/modules/projects/components/project-milestones-tab";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    return {
      title: "Project Not Found | Orbit HQ",
    };
  }

  return {
    title: `${project.name} | Orbit HQ`,
    description: `Project engagement workspace for ${project.name} at Celestia Studios.`,
  };
}

export const dynamic = "force-dynamic";

export default async function HQProjectDetailPage({ params }: PageProps) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Project Workspace Header */}
      <ProjectDetailHeader project={project} />

      {/* Main Content Layout */}
      <div className="space-y-10">
        {/* Section 1: Overview & Dynamic Progress */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Overview & Delivery Progress
          </h2>
          <ProjectOverviewTab project={project} />
        </section>

        {/* Section 2: Milestones & Tasks */}
        <section className="space-y-4 pt-6 border-t border-border/40">
          <ProjectMilestonesTab project={project} />
        </section>
      </div>
    </div>
  );
}
