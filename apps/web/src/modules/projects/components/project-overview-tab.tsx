import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Building2,
  Layers,
  CheckCircle2,
  ListTodo,
  FileText,
  Flag,
  ArrowUpRight,
  Eye,
  EyeOff,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServiceTypeBadge } from "./service-type-badge";
import type { ProjectDetails, MilestoneStatus, TaskStatus, TaskPriority } from "../types";
import type { DeliverableWithMilestone } from "@/modules/deliverables/types";
import { cn } from "@/lib/utils";

interface ProjectOverviewTabProps {
  project: ProjectDetails;
  deliverables?: DeliverableWithMilestone[];
}

const milestoneStatusConfig: Record<
  MilestoneStatus,
  { label: string; className: string }
> = {
  NOT_STARTED: {
    label: "Not Started",
    className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-400 font-normal text-xs",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-400 font-normal text-xs",
  },
  COMPLETED: {
    label: "Completed",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-normal text-xs",
  },
};

const taskPriorityConfig: Record<
  TaskPriority,
  { label: string; className: string }
> = {
  LOW: {
    label: "Low",
    className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-400 text-[10px]",
  },
  MEDIUM: {
    label: "Medium",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-400 text-[10px]",
  },
  HIGH: {
    label: "High",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-400 text-[10px]",
  },
  URGENT: {
    label: "Urgent",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-400 text-[10px]",
  },
};

const taskStatusConfig: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  TODO: {
    label: "To Do",
    className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-400 text-[10px]",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-400 text-[10px]",
  },
  REVIEW: {
    label: "In Review",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-400 text-[10px]",
  },
  COMPLETED: {
    label: "Completed",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px]",
  },
};

export function ProjectOverviewTab({
  project,
  deliverables = [],
}: ProjectOverviewTabProps) {
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

  // Aggregate all tasks across milestones
  const allTasks = project.milestones.flatMap((m) =>
    (m.tasks || []).map((t) => ({ ...t, milestoneName: m.name }))
  );
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "COMPLETED").length;
  const inProgressTasks = allTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const pendingTasks = allTasks.filter(
    (t) => t.status === "TODO" || t.status === "REVIEW"
  ).length;

  // Identify current active milestone
  const inProgressMilestone = project.milestones.find((m) => m.status === "IN_PROGRESS");
  const nextNotStartedMilestone = project.milestones.find((m) => m.status === "NOT_STARTED");
  const currentMilestone =
    inProgressMilestone ||
    nextNotStartedMilestone ||
    (project.milestones.length > 0 && project.completed_milestone_count === project.milestone_count
      ? { name: "All milestones completed" }
      : null);

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
              Calculated dynamically from milestone completion.
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
                No milestones defined yet. Add milestones in the Milestones tab to track delivery.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3-Column Summary Cards: Milestone Summary, Task Summary, Deliverables Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Milestone Summary Card */}
        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Milestones</CardTitle>
              <CardDescription className="text-xs">
                {project.completed_milestone_count} of {project.milestone_count} completed
              </CardDescription>
            </div>
            <Link
              href={`/hq/projects/${project.id}?tab=milestones`}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium"
            >
              <span>View all</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="p-3 rounded-md bg-secondary/30 border border-border/40 space-y-1">
              <div className="text-xs text-muted-foreground">Current Milestone</div>
              <div className="text-sm font-medium text-foreground truncate">
                {currentMilestone ? currentMilestone.name : "No milestones created yet"}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Remaining:</span>
              <span className="font-mono font-medium text-foreground">
                {Math.max(0, project.milestone_count - project.completed_milestone_count)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Task Summary Card */}
        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Tasks</CardTitle>
              <CardDescription className="text-xs">
                {totalTasks > 0 ? `${totalTasks} total tasks` : "No tasks created yet"}
              </CardDescription>
            </div>
            <Link
              href={`/hq/projects/${project.id}?tab=tasks`}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium"
            >
              <span>View all</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {totalTasks === 0 ? (
              <div className="p-3 rounded-md bg-secondary/20 border border-border/30 text-xs text-muted-foreground">
                No tasks yet. Create tasks in the Tasks tab.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-400 font-medium">Done</div>
                  <div className="text-base font-bold font-mono text-emerald-300">{completedTasks}</div>
                </div>
                <div className="p-2 rounded-md bg-sky-500/10 border border-sky-500/20">
                  <div className="text-[10px] text-sky-400 font-medium">Active</div>
                  <div className="text-base font-bold font-mono text-sky-300">{inProgressTasks}</div>
                </div>
                <div className="p-2 rounded-md bg-zinc-500/10 border border-zinc-500/20">
                  <div className="text-[10px] text-zinc-400 font-medium">Todo</div>
                  <div className="text-base font-bold font-mono text-zinc-300">{pendingTasks}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deliverables Summary Card */}
        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Deliverables</CardTitle>
              <CardDescription className="text-xs">
                {deliverables.length > 0
                  ? `${deliverables.length} total outputs`
                  : "No deliverables added yet"}
              </CardDescription>
            </div>
            <Link
              href={`/hq/projects/${project.id}?tab=deliverables`}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium"
            >
              <span>View all</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {deliverables.length === 0 ? (
              <div className="p-3 rounded-md bg-secondary/20 border border-border/30 text-xs text-muted-foreground">
                No deliverables yet. Add deliverables in the Deliverables tab.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-400 font-medium">Approved</div>
                  <div className="text-base font-bold font-mono text-emerald-300">
                    {deliverables.filter((d) => d.status === "APPROVED").length}
                  </div>
                </div>
                <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <div className="text-[10px] text-amber-400 font-medium">In Review</div>
                  <div className="text-base font-bold font-mono text-amber-300">
                    {
                      deliverables.filter(
                        (d) =>
                          d.status === "READY_FOR_REVIEW" ||
                          d.status === "CHANGES_REQUESTED"
                      ).length
                    }
                  </div>
                </div>
                <div className="p-2 rounded-md bg-zinc-500/10 border border-zinc-500/20">
                  <div className="text-[10px] text-zinc-400 font-medium">Planned / WIP</div>
                  <div className="text-base font-bold font-mono text-zinc-300">
                    {
                      deliverables.filter(
                        (d) => d.status === "PLANNED" || d.status === "IN_PROGRESS"
                      ).length
                    }
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compact Milestone Preview Section */}
      <Card className="border-border/70 bg-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Milestones Preview</CardTitle>
            <CardDescription className="text-xs">
              Delivery progression and sequential milestone phases.
            </CardDescription>
          </div>
          <Link
            href={`/hq/projects/${project.id}?tab=milestones`}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium"
          >
            <span>Manage Milestones</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {project.milestones.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 italic">
              No milestones have been defined for this project yet.
            </p>
          ) : (
            <div className="divide-y divide-border/40">
              {project.milestones.map((m, index) => {
                const config = milestoneStatusConfig[m.status] || milestoneStatusConfig.NOT_STARTED;
                const phaseNum = String(index + 1).padStart(2, "0");

                return (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground font-semibold">
                        {phaseNum}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-foreground">{m.name}</div>
                        {m.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {m.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-center">
                      <span className="text-xs text-muted-foreground font-mono">
                        {m.completed_task_count} / {m.task_count} tasks
                      </span>
                      <Badge variant="outline" className={config.className}>
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compact Tasks Preview Section (if tasks exist) */}
      {totalTasks > 0 && (
        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Recent Tasks</CardTitle>
              <CardDescription className="text-xs">
                Active deliverable items across project milestones.
              </CardDescription>
            </div>
            <Link
              href={`/hq/projects/${project.id}?tab=tasks`}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium"
            >
              <span>All Tasks ({totalTasks})</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40">
              {allTasks.slice(0, 6).map((task) => {
                const statusConfig = taskStatusConfig[task.status] || taskStatusConfig.TODO;
                const priorityConfig = taskPriorityConfig[task.priority] || taskPriorityConfig.MEDIUM;

                return (
                  <div
                    key={task.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2.5 first:pt-0 last:pb-0 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-medium text-foreground truncate">{task.title}</span>
                      <span className="text-muted-foreground text-[11px] truncate shrink-0">
                        • {task.milestoneName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <Badge variant="outline" className={priorityConfig.className}>
                        {priorityConfig.label}
                      </Badge>
                      <Badge variant="outline" className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                      <span
                        title={task.client_visible ? "Visible to client in Client Portal" : "Internal Celestia task only"}
                        className="text-muted-foreground p-0.5"
                      >
                        {task.client_visible ? (
                          <Eye className="h-3 w-3 text-sky-400" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-zinc-500" />
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
