import * as React from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  Calendar,
  FolderKanban,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AddProjectDialog } from "@/modules/projects/components/add-project-dialog";
import { ProjectStatusBadge } from "@/modules/projects/components/project-status-badge";
import { ServiceTypeBadge } from "@/modules/projects/components/service-type-badge";
import { ProjectProgressBar } from "@/modules/projects/components/project-progress-bar";
import { PortalAccessCard } from "./portal-access-card";
import type { Client } from "../types";
import type { ProjectWithClient } from "@/modules/projects/types";
import type { Profile } from "@/lib/supabase/types";

interface ClientOverviewTabProps {
  client: Client;
  projects?: ProjectWithClient[];
  portalUsers?: Profile[];
}

export function ClientOverviewTab({
  client,
  projects = [],
  portalUsers = [],
}: ClientOverviewTabProps) {
  function formatDate(iso: string | null) {
    if (!iso) return "Not specified";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  const clientOption = [{ id: client.id, name: client.name }];

  return (
    <div className="space-y-8">
      {/* Grid: Client Contact & Account Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Contact Details */}
        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Primary Contact</CardTitle>
            <CardDescription className="text-xs">
              Direct point of contact for Celestia Studios engagements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40 shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Contact Name</div>
                <div className="font-medium text-foreground">{client.primary_contact_name}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40 shrink-0">
                <Mail className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Email Address</div>
                <a
                  href={`mailto:${client.primary_contact_email}`}
                  className="font-medium text-foreground hover:underline truncate block"
                >
                  {client.primary_contact_email}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40 shrink-0">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Phone Number</div>
                <div className="font-medium text-foreground">
                  {client.primary_contact_phone || "Not provided"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Details & Metadata */}
        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Account Metadata</CardTitle>
            <CardDescription className="text-xs">
              Orbit system records and engagement timestamps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40 shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Client Created</div>
                <div className="font-medium text-foreground">{formatDate(client.created_at)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40 shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Last Updated</div>
                <div className="font-medium text-foreground">{formatDate(client.updated_at)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portal Access Management */}
      <PortalAccessCard client={client} portalUsers={portalUsers} />

      {/* Notes section if present */}
      {client.notes && (
        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Engagement Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {client.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Active Projects Section */}
      <Card className="border-border/70 bg-card">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Projects ({projects.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Active deliverables and service systems executing for {client.name}.
            </CardDescription>
          </div>

          <AddProjectDialog
            clients={clientOption}
            preselectedClientId={client.id}
            triggerButtonText="New Project"
          />
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-secondary/20 p-8 text-center">
              <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
                <div className="rounded-full bg-secondary/70 p-3 text-muted-foreground border border-border/40">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-foreground">No projects yet</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Create the first project for this client to begin tracking milestones and delivery.
                  </p>
                </div>
                <div className="pt-2">
                  <AddProjectDialog
                    clients={clientOption}
                    preselectedClientId={client.id}
                    triggerButtonText="Create First Project"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-secondary/30 text-[11px] font-medium uppercase tracking-wider text-muted-foreground font-mono">
                    <th className="py-2.5 px-4">Project</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 w-40">Progress</th>
                    <th className="py-2.5 px-4">Target Date</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="hover:bg-accent/40 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col space-y-1">
                          <Link
                            href={`/hq/projects/${project.id}`}
                            className="font-medium text-foreground group-hover:text-primary transition-colors inline-block"
                          >
                            {project.name}
                          </Link>
                          <div>
                            <ServiceTypeBadge serviceType={project.service_type} />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <ProjectStatusBadge status={project.status} />
                      </td>

                      <td className="py-3 px-4">
                        <ProjectProgressBar
                          progress={project.progress}
                          milestoneCount={project.milestone_count}
                          completedMilestoneCount={project.completed_milestone_count}
                        />
                      </td>

                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {formatDate(project.target_date)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/hq/projects/${project.id}`}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground group-hover:text-foreground hover:bg-secondary transition-colors"
                          aria-label={`Open ${project.name} workspace`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
