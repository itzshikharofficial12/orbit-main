import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, CheckCircle2, Clock, CircleDot, AlertCircle } from "lucide-react";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getClientProjectById } from "@/modules/projects/data";
import { getClientVisibleDeliverablesByProjectId } from "@/modules/deliverables/data";
import { getClientRequestsByProjectId } from "@/modules/requests/data";
import { ClientDeliverablesSection } from "@/modules/deliverables/components/client-deliverables-section";
import { ClientRequestsSection } from "@/modules/requests/components/client-requests-section";
import { ServiceTypeBadge } from "@/modules/projects/components/service-type-badge";
import { ProjectStatusBadge } from "@/modules/projects/components/project-status-badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MilestoneStatus, TaskStatus, TaskPriority } from "@/modules/projects/types";
import { cn } from "@/lib/utils";

interface ClientProjectDetailPageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({ params }: ClientProjectDetailPageProps) {
  const { projectId } = await params;
  const profile = await getAuthenticatedProfile();

  if (!profile || !profile.client_id) {
    return { title: "Project — Orbit" };
  }

  const project = await getClientProjectById(projectId, profile.client_id);
  if (!project) {
    return { title: "Project Not Found — Orbit" };
  }

  return {
    title: `${project.name} — Client Portal | Orbit`,
    description: `Project engagement workspace for ${project.name} at Celestia Studios.`,
  };
}

export const dynamic = "force-dynamic";

export default async function ClientProjectDetailPage({ params }: ClientProjectDetailPageProps) {
  const { projectId } = await params;
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect(`/login?redirect=/client/projects/${projectId}`);
  }

  if (profile.role === "SUPER_ADMIN") {
    redirect(`/hq/projects/${projectId}`);
  }

  if (!profile.client_id) {
    notFound();
  }

  const [project, deliverables, requests] = await Promise.all([
    getClientProjectById(projectId, profile.client_id),
    getClientVisibleDeliverablesByProjectId(projectId),
    getClientRequestsByProjectId(projectId),
  ]);

  if (!project) {
    notFound();
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  function renderMilestoneStatusBadge(status: MilestoneStatus) {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 className="h-3 w-3" />
            <span>Completed</span>
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-950/60 text-sky-400 border border-sky-800/60">
            <Clock className="h-3 w-3" />
            <span>In Progress</span>
          </span>
        );
      case "NOT_STARTED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
            <CircleDot className="h-3 w-3" />
            <span>Not Started</span>
          </span>
        );
    }
  }

  function renderTaskStatusBadge(status: TaskStatus) {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="outline" className="text-[11px] font-mono border-emerald-900/60 text-emerald-400 bg-emerald-950/30">
            COMPLETED
          </Badge>
        );
      case "REVIEW":
        return (
          <Badge variant="outline" className="text-[11px] font-mono border-amber-900/60 text-amber-400 bg-amber-950/30">
            IN REVIEW
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge variant="outline" className="text-[11px] font-mono border-sky-900/60 text-sky-400 bg-sky-950/30">
            IN PROGRESS
          </Badge>
        );
      case "TODO":
      default:
        return (
          <Badge variant="outline" className="text-[11px] font-mono border-border/80 text-muted-foreground bg-secondary/40">
            TODO
          </Badge>
        );
    }
  }

  function renderPriorityBadge(priority: TaskPriority) {
    switch (priority) {
      case "URGENT":
        return <span className="text-[10px] uppercase font-mono text-red-400 bg-red-950/40 border border-red-800/40 px-1.5 py-0.5 rounded">Urgent</span>;
      case "HIGH":
        return <span className="text-[10px] uppercase font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">High</span>;
      case "MEDIUM":
        return <span className="text-[10px] uppercase font-mono text-zinc-300 bg-secondary px-1.5 py-0.5 rounded">Medium</span>;
      case "LOW":
      default:
        return <span className="text-[10px] uppercase font-mono text-zinc-400 bg-secondary/50 px-1.5 py-0.5 rounded">Low</span>;
    }
  }

  return (
    <OrbitShell
      profile={profile}
      basePath="/client"
      title={project.name}
      description="Client engagement workspace."
    >
      <div className="space-y-8">
        {/* Navigation & Header */}
        <div className="space-y-4">
          <div>
            <Link
              href="/client"
              className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Overview</span>
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/40">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {project.name}
                </h1>
                <ProjectStatusBadge status={project.status} />
                <ServiceTypeBadge serviceType={project.service_type} />
              </div>

              {project.client && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Client Account:</span>
                  <span className="font-medium text-foreground inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{project.client.name}</span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
              {project.start_date && (
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Start Date</span>
                  <span className="text-foreground">{formatDate(project.start_date)}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Target Delivery</span>
                <span className="text-foreground font-medium">{formatDate(project.target_date)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Description (if any) */}
        {project.description && (
          <div className="p-4 rounded-lg border border-border/60 bg-secondary/20 text-xs text-muted-foreground leading-relaxed">
            {project.description}
          </div>
        )}

        {/* Progress Card */}
        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-semibold">Delivery Progress</CardTitle>
                <CardDescription className="text-xs">
                  Overall milestone completion status across project deliverables.
                </CardDescription>
              </div>
              <span className="text-2xl font-bold font-mono text-foreground">
                {project.progress}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.milestone_count === 0 ? (
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-muted w-0" />
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  No milestones defined yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      project.progress === 100
                        ? "bg-emerald-500"
                        : "bg-primary"
                    )}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>{project.completed_milestone_count} of {project.milestone_count} milestones completed</span>
                  <span>Target: {formatDate(project.target_date)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deliverables Section */}
        <ClientDeliverablesSection projectId={project.id} deliverables={deliverables} />

        {/* Change Requests Section */}
        <ClientRequestsSection requests={requests} />

        {/* Milestones & Client-Visible Tasks */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Milestone Progression
            </h2>
            <p className="text-xs text-muted-foreground">
              Phase-by-phase delivery breakdown and client-visible milestone tasks.
            </p>
          </div>

          {project.milestones.length === 0 ? (
            <Card className="border-border/60 bg-card/30 text-center p-8">
              <CardContent className="flex flex-col items-center justify-center space-y-2 pt-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">No milestones defined</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Project milestones will appear here as Celestia Studios schedules delivery phases.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {project.milestones.map((milestone, index) => {
                const phaseNumber = String(index + 1).padStart(2, "0");
                const tasks = milestone.tasks || [];

                return (
                  <div
                    key={milestone.id}
                    className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm space-y-0"
                  >
                    {/* Milestone Header */}
                    <div className="p-4 sm:p-5 bg-secondary/25 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-secondary text-muted-foreground border border-border/60">
                          {phaseNumber}
                        </span>
                        <div className="space-y-0.5">
                          <h3 className="text-base font-semibold text-foreground">
                            {milestone.name}
                          </h3>
                          {milestone.description && (
                            <p className="text-xs text-muted-foreground">
                              {milestone.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {renderMilestoneStatusBadge(milestone.status)}
                      </div>
                    </div>

                    {/* Client Visible Tasks */}
                    <div className="p-4 sm:p-5 space-y-3 bg-card">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                        Phase Tasks ({tasks.length})
                      </div>

                      {tasks.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground italic border border-dashed border-border/60 rounded-lg bg-secondary/10">
                          No client tasks scheduled for this phase.
                        </div>
                      ) : (
                        <div className="divide-y divide-border/40 border border-border/60 rounded-lg overflow-hidden bg-secondary/15">
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-secondary/30 transition-colors"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground truncate">
                                    {task.title}
                                  </span>
                                  {renderPriorityBadge(task.priority)}
                                </div>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                                {task.due_date && (
                                  <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(task.due_date)}</span>
                                  </span>
                                )}
                                {renderTaskStatusBadge(task.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </OrbitShell>
  );
}
