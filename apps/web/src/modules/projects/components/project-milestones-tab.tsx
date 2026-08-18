"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  AlertCircle,
  FolderPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddMilestoneDialog } from "./add-milestone-dialog";
import { AddTaskDialog } from "./add-task-dialog";
import {
  updateMilestoneStatusAction,
  deleteMilestoneAction,
  updateTaskStatusAction,
  deleteTaskAction,
} from "../actions";
import type {
  ProjectDetails,
  MilestoneWithTasks,
  MilestoneStatus,
  Task,
  TaskStatus,
  TaskPriority,
} from "../types";
import { cn } from "@/lib/utils";

interface ProjectMilestonesTabProps {
  project: ProjectDetails;
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

export function ProjectMilestonesTab({ project }: ProjectMilestonesTabProps) {
  const router = useRouter();

  async function handleMilestoneStatusChange(
    milestoneId: string,
    newStatus: MilestoneStatus
  ) {
    await updateMilestoneStatusAction(milestoneId, project.id, newStatus);
    router.refresh();
  }

  async function handleDeleteMilestone(milestoneId: string, milestoneName: string) {
    if (
      !window.confirm(
        `Are you sure you want to delete "${milestoneName}" and all of its tasks?`
      )
    ) {
      return;
    }
    await deleteMilestoneAction(milestoneId, project.id);
    router.refresh();
  }

  async function handleTaskStatusChange(taskId: string, newStatus: TaskStatus) {
    await updateTaskStatusAction(taskId, project.id, newStatus);
    router.refresh();
  }

  async function handleDeleteTask(taskId: string) {
    if (!window.confirm("Delete this task?")) return;
    await deleteTaskAction(taskId, project.id);
    router.refresh();
  }

  function formatDate(iso: string | null) {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Milestones & Tasks
          </h3>
          <p className="text-xs text-muted-foreground">
            Structured deliverables determining project completion progress.
          </p>
        </div>

        <AddMilestoneDialog
          projectId={project.id}
          nextPosition={project.milestones.length}
        />
      </div>

      {/* Empty Milestones State */}
      {project.milestones.length === 0 && (
        <div className="rounded-xl border border-border/70 bg-card p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
            <div className="rounded-full bg-secondary/60 p-3.5 text-muted-foreground border border-border/40">
              <FolderPlus className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-medium text-foreground">
                No Milestones Created
              </h4>
              <p className="text-xs text-muted-foreground">
                Create structured milestones to track delivery phases, define tasks, and calculate project completion progress.
              </p>
            </div>
            <div className="pt-2">
              <AddMilestoneDialog
                projectId={project.id}
                nextPosition={0}
              />
            </div>
          </div>
        </div>
      )}

      {/* Milestones List */}
      {project.milestones.length > 0 && (
        <div className="space-y-5">
          {project.milestones.map((milestone, index) => {
            const statusConfig =
              milestoneStatusConfig[milestone.status] ||
              milestoneStatusConfig.NOT_STARTED;

            return (
              <div
                key={milestone.id}
                className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs transition-colors"
              >
                {/* Milestone Header */}
                <div className="p-4 sm:p-5 bg-secondary/25 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-muted-foreground">
                        Phase {index + 1}
                      </span>
                      <h4 className="font-semibold text-foreground text-sm sm:text-base truncate">
                        {milestone.name}
                      </h4>
                      <Badge
                        className={cn(
                          "capitalize select-none",
                          statusConfig.className
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full mr-1.5 inline-block bg-current opacity-80" />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {milestone.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {milestone.description}
                      </p>
                    )}
                  </div>

                  {/* Milestone Controls */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {/* Status Dropdown */}
                    <select
                      value={milestone.status}
                      onChange={(e) =>
                        handleMilestoneStatusChange(
                          milestone.id,
                          e.target.value as MilestoneStatus
                        )
                      }
                      className="h-8 rounded-md border border-border/80 bg-card px-2.5 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                    >
                      <option value="NOT_STARTED">NOT STARTED</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>

                    <AddTaskDialog
                      milestoneId={milestone.id}
                      milestoneName={milestone.name}
                      projectId={project.id}
                      nextPosition={milestone.tasks.length}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteMilestone(milestone.id, milestone.name)
                      }
                      className="p-1.5 text-muted-foreground hover:text-red-400 rounded-md hover:bg-secondary/60 transition-colors cursor-pointer"
                      title="Delete milestone"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tasks Container */}
                <div className="p-4 sm:p-5">
                  {milestone.tasks.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground italic">
                      No tasks created for this milestone yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {milestone.tasks.map((task) => {
                        const priorityConfig =
                          taskPriorityConfig[task.priority] ||
                          taskPriorityConfig.MEDIUM;

                        return (
                          <div
                            key={task.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg border border-border/50 bg-secondary/15 hover:bg-secondary/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Task Status Checkbox */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleTaskStatusChange(
                                    task.id,
                                    task.status === "COMPLETED" ? "TODO" : "COMPLETED"
                                  )
                                }
                                className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                                title={
                                  task.status === "COMPLETED"
                                    ? "Mark incomplete"
                                    : "Mark completed"
                                }
                              >
                                {task.status === "COMPLETED" ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border border-muted-foreground/60 hover:border-foreground" />
                                )}
                              </button>

                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={cn(
                                      "text-xs font-medium text-foreground",
                                      task.status === "COMPLETED" &&
                                        "line-through text-muted-foreground"
                                    )}
                                  >
                                    {task.title}
                                  </span>

                                  {/* Priority Badge */}
                                  <Badge
                                    className={cn(
                                      "capitalize font-normal",
                                      priorityConfig.className
                                    )}
                                  >
                                    {priorityConfig.label}
                                  </Badge>

                                  {/* Client Visibility */}
                                  {task.client_visible ? (
                                    <span
                                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80 font-mono"
                                      title="Visible in Client Portal"
                                    >
                                      <Eye className="h-3 w-3" />
                                      <span>Client</span>
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-mono"
                                      title="Internal only"
                                    >
                                      <EyeOff className="h-3 w-3" />
                                      <span>Internal</span>
                                    </span>
                                  )}
                                </div>

                                {task.description && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Task Controls: Status & Due Date & Delete */}
                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              {task.due_date && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono mr-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(task.due_date)}
                                </span>
                              )}

                              {/* Task Status Dropdown */}
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  handleTaskStatusChange(
                                    task.id,
                                    e.target.value as TaskStatus
                                  )
                                }
                                className="h-7 rounded-md border border-border/80 bg-card px-2 text-[11px] text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                              >
                                <option value="TODO">TODO</option>
                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                <option value="REVIEW">REVIEW</option>
                                <option value="COMPLETED">COMPLETED</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 text-muted-foreground hover:text-red-400 rounded transition-colors cursor-pointer"
                                title="Delete task"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
