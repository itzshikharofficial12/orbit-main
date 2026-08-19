import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getClientById } from "@/modules/clients/data";
import { getProjectsByClientId } from "@/modules/projects/data";
import { getPendingReviewDeliverablesForClient } from "@/modules/deliverables/data";
import { getUpcomingMeetingForClient } from "@/modules/meetings/data";
import { UpcomingMeetingCardClient } from "@/modules/meetings/components/upcoming-meeting-card-client";
import type { ProjectWithClient } from "@/modules/projects/types";
import type { DeliverableWithMilestone } from "@/modules/deliverables/types";
import { DeliverableStatusBadge } from "@/modules/deliverables/components/deliverable-status-badge";
import { ClientStatusBadge } from "@/modules/clients/components/client-status-badge";
import { ServiceTypeBadge } from "@/modules/projects/components/service-type-badge";
import { ProjectStatusBadge } from "@/modules/projects/components/project-status-badge";
import { ProjectProgressBar } from "@/modules/projects/components/project-progress-bar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Calendar, ArrowRight, Activity, AlertCircle, CheckCircle2, Building2, Package, ExternalLink } from "lucide-react";

export const metadata = {
  title: "Client Portal — Orbit",
  description: "Celestia Studios client workspace.",
};

export const dynamic = "force-dynamic";

export default async function ClientPortalPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/client");
  }

  if (profile.role === "SUPER_ADMIN") {
    redirect("/hq");
  }

  const [client, projects, pendingReviewDeliverables, upcomingMeeting] = await Promise.all([
    profile.client_id ? getClientById(profile.client_id) : Promise.resolve(null),
    profile.client_id ? getProjectsByClientId(profile.client_id) : Promise.resolve([]),
    getPendingReviewDeliverablesForClient(),
    profile.client_id ? getUpcomingMeetingForClient(profile.client_id) : Promise.resolve(null),
  ]);

  const firstName = profile.first_name || "there";

  // Calculate real operational overview metrics from projects
  const activeCount = projects.filter((p) => p.status === "ACTIVE").length;
  const attentionCount = projects.filter(
    (p) => p.status === "IN_REVIEW" || p.status === "ON_HOLD" || p.status === "PLANNING"
  ).length;
  const completedCount = projects.filter((p) => p.status === "COMPLETED").length;

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

  return (
    <OrbitShell
      profile={profile}
      basePath="/client"
      title={`Namaste, ${firstName}`}
      description="Celestia Studios Client Portal"
    >
      <div className="space-y-8">
        {/* Operational Metric Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border-border/70 bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs uppercase tracking-wider font-mono">
                  Active Projects
                </CardDescription>
                <Activity className="h-4 w-4 text-emerald-500" />
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight">
                {activeCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {activeCount === 1 ? "1 project in active delivery" : `${activeCount} projects in active delivery`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs uppercase tracking-wider font-mono">
                  Projects Needing Attention
                </CardDescription>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight">
                {attentionCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                In planning, review, or on hold
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs uppercase tracking-wider font-mono">
                  Completed Projects
                </CardDescription>
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight">
                {completedCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Engagements delivered successfully
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Client Workspace Account Banner if Client Linked */}
        {client && (
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/60 bg-secondary/20 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-secondary/80 text-muted-foreground border border-border/40">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <span className="font-semibold text-foreground text-sm block">
                  {client.name}
                </span>
                <span className="text-muted-foreground">
                  Primary Contact: {client.primary_contact_name} ({client.primary_contact_email})
                </span>
              </div>
            </div>
            <ClientStatusBadge status={client.status} />
          </div>
        )}

        {/* Upcoming Meeting Alert (if scheduled) */}
        <UpcomingMeetingCardClient meeting={upcomingMeeting} />

        {/* Needs Your Review Section (Highlighted if items exist) */}
        {pendingReviewDeliverables.length > 0 && (
          <Card className="border-amber-700/60 bg-card overflow-hidden shadow-sm">
            <CardHeader className="pb-3 bg-amber-950/20 border-b border-amber-800/40">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <CardTitle className="text-base font-semibold text-foreground">
                      Needs Your Review ({pendingReviewDeliverables.length})
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-amber-200/80">
                    Deliverables submitted by Celestia Studios ready for your approval.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-mono border-amber-600/60 bg-amber-950/40 text-amber-300"
                >
                  Action Required
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {pendingReviewDeliverables.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border border-amber-700/40 bg-secondary/20 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="font-semibold text-foreground text-xs leading-snug">
                          {item.title}
                        </span>
                        <DeliverableStatusBadge status={item.status} />
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                      {item.submitted_at ? (
                        <span>Submitted {formatDate(item.submitted_at)}</span>
                      ) : (
                        <span>Ready for review</span>
                      )}
                      <Link href={`/client/projects/${item.project_id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2.5 gap-1 bg-amber-950/30 border-amber-700/60 text-amber-200 hover:bg-amber-900/40 cursor-pointer"
                        >
                          <span>Review</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Your Projects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Your Projects
              </h2>
              <p className="text-xs text-muted-foreground">
                Track delivery progress, milestones, and deliverables for your account.
              </p>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
                <div className="rounded-full bg-secondary/60 p-3.5 text-muted-foreground border border-border/40">
                  <FolderKanban className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-medium text-foreground">
                    No projects yet
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your Celestia Studios engagements will appear here once a project has been created.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-4 shadow-sm hover:border-border transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                          href={`/client/projects/${project.id}`}
                          className="text-lg font-semibold text-foreground hover:text-primary transition-colors truncate"
                        >
                          {project.name}
                        </Link>
                        <ProjectStatusBadge status={project.status} />
                      </div>
                      <div className="pt-0.5">
                        <ServiceTypeBadge serviceType={project.service_type} />
                      </div>
                    </div>

                    <Link href={`/client/projects/${project.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 gap-1.5 w-full sm:w-auto cursor-pointer"
                      >
                        <span>View Project</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>

                  {project.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  {/* Progress and Milestones Meta */}
                  <div className="pt-3 border-t border-border/40 space-y-2.5">
                    {project.milestone_count === 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium font-mono text-muted-foreground">
                            0% (No milestones yet)
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-muted w-0" />
                        </div>
                      </div>
                    ) : (
                      <ProjectProgressBar
                        progress={project.progress}
                        milestoneCount={project.milestone_count}
                        completedMilestoneCount={project.completed_milestone_count}
                      />
                    )}

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pt-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Target Date: {formatDate(project.target_date)}</span>
                      </span>
                      <span>
                        {project.milestone_count === 0
                          ? "No milestones defined"
                          : `${project.completed_milestone_count} of ${project.milestone_count} milestones completed`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </OrbitShell>
  );
}
