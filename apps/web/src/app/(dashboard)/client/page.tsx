import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getClientById } from "@/modules/clients/data";
import { getProjectsByClientId } from "@/modules/projects/data";
import { ClientStatusBadge } from "@/modules/clients/components/client-status-badge";
import { ServiceTypeBadge } from "@/modules/projects/components/service-type-badge";
import { ProjectStatusBadge } from "@/modules/projects/components/project-status-badge";
import { ProjectProgressBar } from "@/modules/projects/components/project-progress-bar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FolderKanban, User, Mail, Phone, Calendar } from "lucide-react";

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

  const [client, projects] = await Promise.all([
    profile.client_id ? getClientById(profile.client_id) : Promise.resolve(null),
    profile.client_id ? getProjectsByClientId(profile.client_id) : Promise.resolve([]),
  ]);

  const firstName = profile.first_name || "there";

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
      description={client ? `${client.name} Workspace` : "Celestia Studios Client Portal"}
    >
      <div className="space-y-8">
        {/* Client Engagement Overview */}
        {client ? (
          <div className="space-y-6">
            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold">{client.name}</CardTitle>
                    <CardDescription className="text-xs">
                      Active engagement with Celestia Studios.
                    </CardDescription>
                  </div>
                  <ClientStatusBadge status={client.status} />
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
                <div className="flex items-center gap-2.5">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Primary Contact</span>
                    <span className="font-medium text-foreground">{client.primary_contact_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="truncate">
                    <span className="text-muted-foreground block text-[11px]">Contact Email</span>
                    <span className="font-medium text-foreground truncate">{client.primary_contact_email}</span>
                  </div>
                </div>
                {client.primary_contact_phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Phone</span>
                      <span className="font-medium text-foreground">{client.primary_contact_phone}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Projects Section */}
            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">
                  Engagements & Deliverables ({projects.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Active systems and project tracks being executed by Celestia Studios for your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/80 bg-secondary/20 p-8 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2.5 max-w-md mx-auto">
                      <div className="rounded-full bg-secondary/70 p-3 text-muted-foreground border border-border/40">
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-foreground">No active projects</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Project tracking and milestones will appear here as Celestia Studios initiates delivery.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="rounded-lg border border-border/60 bg-secondary/20 p-5 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-foreground text-base">
                              {project.name}
                            </h4>
                            <ServiceTypeBadge serviceType={project.service_type} />
                          </div>
                          <ProjectStatusBadge status={project.status} />
                        </div>

                        {project.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {project.description}
                          </p>
                        )}

                        <div className="pt-3 border-t border-border/40 space-y-2">
                          <ProjectProgressBar
                            progress={project.progress}
                            milestoneCount={project.milestone_count}
                            completedMilestoneCount={project.completed_milestone_count}
                          />

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Target Date: {formatDate(project.target_date)}
                            </span>
                            <span>{project.milestone_count} milestones defined</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-border/70 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Client Workspace</CardTitle>
              <CardDescription className="text-xs">
                Your account is authenticated. Client engagement data will be linked by Celestia Studios administration.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </OrbitShell>
  );
}
