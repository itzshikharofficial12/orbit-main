import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Building2,
  Layers,
  CheckCircle2,
  ListTodo,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ServiceTypeBadge } from "./service-type-badge";
import type { ProjectDetails } from "../types";

interface ProjectOverviewTabProps {
  project: ProjectDetails;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
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

  const totalTasks = project.milestones.reduce(
    (acc, m) => acc + (m.task_count || 0),
    0
  );
  const completedTasks = project.milestones.reduce(
    (acc, m) => acc + (m.completed_task_count || 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* 2-Column Grid: Details + Dynamic Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Engagement Parameters Card */}
        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Engagement Parameters</CardTitle>
            <CardDescription className="text-xs">
              Client account and delivery schedule for this project.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            {/* Client */}
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40 shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Client Account</div>
                {project.client ? (
                  <Link
                    href={`/hq/clients/${project.client_id}`}
                    className="font-medium text-foreground hover:underline truncate block"
                  >
                    {project.client.name}
                  </Link>
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">
                    {project.client_id}
                  </span>
                )}
              </div>
            </div>

            {/* Service System */}
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40 shrink-0">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Service System</div>
                <div className="mt-0.5">
                  <ServiceTypeBadge serviceType={project.service_type} />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40 shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Start Date</div>
                  <div className="font-medium text-foreground text-xs">
                    {formatDate(project.start_date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Target Date</div>
                  <div className="font-medium text-foreground text-xs">
                    {formatDate(project.target_date)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestone Completion Progress Card */}
        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Delivery Progress</CardTitle>
            <CardDescription className="text-xs">
              Calculated dynamically from milestone and deliverable completion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-1">
            {/* Progress Percentage Display */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold tracking-tight text-foreground font-mono">
                  {project.progress}%
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {project.completed_milestone_count} of {project.milestone_count} milestones completed
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80">
                <div
                  className="h-full transition-all duration-300 rounded-full bg-primary"
                  style={{ width: `${Math.min(Math.max(project.progress, 0), 100)}%` }}
                />
              </div>
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Milestones</div>
                  <div className="text-sm font-semibold font-mono">
                    {project.completed_milestone_count} / {project.milestone_count}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <ListTodo className="h-4 w-4 text-sky-400 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Tasks</div>
                  <div className="text-sm font-semibold font-mono">
                    {completedTasks} / {totalTasks}
                  </div>
                </div>
              </div>
            </div>

            {project.milestone_count === 0 && (
              <p className="text-xs text-muted-foreground/80 italic pt-1">
                No milestones have been created yet. Add milestones in the Milestones tab to track progress.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scope & Description Card */}
      {project.description && (
        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Scope & Deliverables</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {project.description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
