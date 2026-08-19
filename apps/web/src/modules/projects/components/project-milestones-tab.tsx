"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  CircleDot,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  AlertCircle,
  FolderPlus,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddMilestoneDialog } from "./add-milestone-dialog";
import { EditMilestoneDialog } from "./edit-milestone-dialog";
import { AddTaskDialog } from "./add-task-dialog";
import { EditTaskDialog } from "./edit-task-dialog";
import {
  updateMilestoneStatusAction,
  deleteMilestoneAction,
  moveMilestoneAction,
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
  { label: string; className: string; icon: typeof CircleDot }
> = {
  NOT_STARTED: {
    label: "Not Started",
    className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400 font-normal text-xs",
    icon: CircleDot,
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-400 font-normal text-xs",
    icon: Clock,
  },
  COMPLETED: {
    label: "Completed",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-normal text-xs",
    icon: CheckCircle2,
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
  const [isReordering, setIsReordering] = React.useState(false);

  async function handleMilestoneStatusChange(
    milestoneId: string,
    newStatus: MilestoneStatus
  ) {
    await updateMilestoneStatusAction(milestoneId, project.id, newStatus);
    router.refresh();
  }

  async function handleMoveMilestone(milestoneId: string, direction: "up" | "down") {
    if (isReordering) return;
    setIsReordering(true);
    await moveMilestoneAction(milestoneId, project.id, direction);
    setIsReordering(false);
    router.refresh();
  }

  async function handleDeleteMilestone(milestone: MilestoneWithTasks) {
    const taskCount = milestone.tasks?.length || 0;
    const warning =
      taskCount > 0
        ? `Are you sure you want to delete "${milestone.name}"?\n\nWarning: This milestone contains ${taskCount} tasks. Deleting it will also remove all associated tasks.`
        : `Are you sure you want to delete "${milestone.name}"?`;

    if (!window.confirm(warning)) {
      return;
    }
    await deleteMilestoneAction(milestone.id, project.id);
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
      {/* Action & Progress Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-foreground">
              Milestones
            </h3>
            {project.milestone_count > 0 && (
              <span className="text-xs text-muted-foreground font-mono">
                {project.completed_milestone_count} of {project.milestone_count} completed ({project.progress}%)
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Sequential delivery phases determining overall project completion.
          </p>
        </div>

        <AddMilestoneDialog
          projectId={project.id}
          nextPosition={project.milestones.length}
        />
      </div>

      {/* Empty Milestones State */}
      {project.milestones.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/80 bg-secondary/20 p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
            <div className="rounded-full bg-secondary/70 p-3.5 text-muted-foreground border border-border/40">
              <FolderPlus className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">No milestones yet</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Create the first milestone to structure this project.
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
        <div className="space-y-6">
          {project.milestones.map((milestone, index) => {
            const config =
              milestoneStatusConfig[milestone.status] || milestoneStatusConfig.NOT_STARTED;
            const Icon = config.icon;
            const phaseNumber = String(index + 1).padStart(2, "0");
            const isFirst = index === 0;
            const isLast = index === project.milestones.length - 1;

            return (
              <div
                key={milestone.id}
                className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm"
              >
                {/* Milestone Header Card */}
                <div className="p-4 sm:p-5 bg-secondary/25 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Phase Number, Title, Description */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-secondary text-foreground border border-border/60 shrink-0 mt-0.5">
                      {phaseNumber}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h4 className="text-base font-semibold text-foreground">
                          {milestone.name}
                        </h4>
                        <Badge variant="outline" className={config.className}>
                          <Icon className="h-3 w-3 mr-1" />
                          <span>{config.label}</span>
                        </Badge>
                      </div>
                      {milestone.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Order controls, Status changer, Edit, Delete */}
                  <div className="flex items-center gap-2 flex-wrap self-start md:self-center shrink-0">
                    {/* Reorder Buttons (Move Up / Move Down) */}
                    <div className="flex items-center border border-border/70 rounded-md bg-secondary/50 overflow-hidden">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isFirst || isReordering}
                        onClick={() => handleMoveMilestone(milestone.id, "up")}
                        title="Move Up"
                        aria-label="Move milestone up"
                        className="h-7 w-7 p-0 rounded-none text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <div className="h-4 w-[1px] bg-border/60" />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLast || isReordering}
                        onClick={() => handleMoveMilestone(milestone.id, "down")}
                        title="Move Down"
                        aria-label="Move milestone down"
                        className="h-7 w-7 p-0 rounded-none text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Status Dropdown */}
                    <select
                      aria-label={`Update status for ${milestone.name}`}
                      value={milestone.status}
                      onChange={(e) =>
                        handleMilestoneStatusChange(
                          milestone.id,
                          e.target.value as MilestoneStatus
                        )
                      }
                      className="h-7 rounded-md border border-border/80 bg-secondary/80 px-2 text-xs text-foreground font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                    >
                      <option value="NOT_STARTED">NOT STARTED</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>

                    {/* Edit Milestone Modal */}
                    <EditMilestoneDialog
                      milestone={milestone}
                      projectId={project.id}
                    />

                    {/* Delete Milestone */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMilestone(milestone)}
                      title="Delete milestone"
                      aria-label="Delete milestone"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Milestone Tasks Container */}
                <div className="p-4 sm:p-5 space-y-3 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        Tasks ({milestone.completed_task_count} / {milestone.task_count})
                      </span>
                      {milestone.task_count > 0 && (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          • {Math.round((milestone.completed_task_count / milestone.task_count) * 100)}% complete
                        </span>
                      )}
                    </div>

                    <AddTaskDialog
                      milestoneId={milestone.id}
                      milestoneName={milestone.name}
                      projectId={project.id}
                      nextPosition={milestone.tasks.length}
                    />
                  </div>

                  {/* Tasks List */}
                  {milestone.tasks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground italic border border-dashed border-border/60 rounded-lg bg-secondary/10">
                      No tasks created for this milestone yet. Click &quot;Add Task&quot; above to begin.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40 border border-border/60 rounded-lg overflow-hidden bg-secondary/10">
                      {milestone.tasks.map((task) => {
                        const priorityConfig =
                          taskPriorityConfig[task.priority] || taskPriorityConfig.MEDIUM;

                        return (
                          <div
                            key={task.id}
                            className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/20 transition-colors"
                          >
                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                aria-label={`Toggle task completion: ${task.title}`}
                                checked={task.status === "COMPLETED"}
                                onChange={(e) =>
                                  handleTaskStatusChange(
                                    task.id,
                                    e.target.checked ? "COMPLETED" : "TODO"
                                  )
                                }
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer mt-0.5 sm:mt-0"
                              />

                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={cn(
                                      "text-xs font-medium",
                                      task.status === "COMPLETED"
                                        ? "line-through text-muted-foreground"
                                        : "text-foreground"
                                    )}
                                  >
                                    {task.title}
                                  </span>
                                  <Badge variant="outline" className={priorityConfig.className}>
                                    {priorityConfig.label}
                                  </Badge>
                                </div>
                                {task.description && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                              {task.due_date && (
                                <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDate(task.due_date)}</span>
                                </span>
                              )}

                              <span
                                title={
                                  task.client_visible
                                    ? "Visible to client in Client Portal"
                                    : "Internal Celestia task only"
                                }
                                className="text-muted-foreground p-1"
                              >
                                {task.client_visible ? (
                                  <Eye className="h-3.5 w-3.5 text-sky-400" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5 text-zinc-500" />
                                )}
                              </span>

                              <EditTaskDialog task={task} projectId={project.id} />

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTask(task.id)}
                                title="Delete task"
                                aria-label={`Delete task ${task.title}`}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
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
