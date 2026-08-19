"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderPlus,
  Filter,
  CheckSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddTaskDialog } from "./add-task-dialog";
import { EditTaskDialog } from "./edit-task-dialog";
import { AddMilestoneDialog } from "./add-milestone-dialog";
import { updateTaskStatusAction, deleteTaskAction } from "../actions";
import type {
  ProjectDetails,
  Task,
  TaskStatus,
  TaskPriority,
} from "../types";
import { cn } from "@/lib/utils";

interface ProjectTasksTabProps {
  project: ProjectDetails;
}

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
    className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-400 text-xs",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-400 text-xs",
  },
  REVIEW: {
    label: "In Review",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs",
  },
  COMPLETED: {
    label: "Completed",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs",
  },
};

export function ProjectTasksTab({ project }: ProjectTasksTabProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedMilestone, setSelectedMilestone] = React.useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = React.useState<string>("ALL");
  const [selectedVisibility, setSelectedVisibility] = React.useState<string>("ALL");

  // Flatten tasks with milestone metadata
  const allTasks = React.useMemo(() => {
    return project.milestones.flatMap((m) =>
      (m.tasks || []).map((t) => ({
        ...t,
        milestoneId: m.id,
        milestoneName: m.name,
      }))
    );
  }, [project.milestones]);

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    return allTasks.filter((task) => {
      // Milestone filter
      if (selectedMilestone !== "ALL" && task.milestoneId !== selectedMilestone) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "ALL" && task.status !== selectedStatus) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== "ALL" && task.priority !== selectedPriority) {
        return false;
      }

      // Visibility filter
      if (selectedVisibility === "CLIENT_VISIBLE" && !task.client_visible) {
        return false;
      }
      if (selectedVisibility === "INTERNAL_ONLY" && task.client_visible) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = task.title.toLowerCase().includes(query);
        const matchDesc = task.description?.toLowerCase().includes(query);
        const matchMilestone = task.milestoneName.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchMilestone) {
          return false;
        }
      }

      return true;
    });
  }, [
    allTasks,
    selectedMilestone,
    selectedStatus,
    selectedPriority,
    selectedVisibility,
    searchQuery,
  ]);

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    await updateTaskStatusAction(taskId, project.id, newStatus);
    router.refresh();
  }

  async function handleDeleteTask(taskId: string) {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }
    await deleteTaskAction(taskId, project.id);
    router.refresh();
  }

  function formatDate(iso: string | null) {
    if (!iso) return "No due date";
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
    <div className="space-y-6">
      {/* Header Bar with Counts & Add Task Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Project Tasks ({filteredTasks.length} of {allTasks.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Operational deliverables and tracking items across all milestones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {project.milestones.length > 0 ? (
            <AddTaskDialog
              milestoneId={
                selectedMilestone !== "ALL"
                  ? selectedMilestone
                  : project.milestones[0].id
              }
              milestoneName={
                selectedMilestone !== "ALL"
                  ? project.milestones.find((m) => m.id === selectedMilestone)?.name || project.milestones[0].name
                  : project.milestones[0].name
              }
              projectId={project.id}
              nextPosition={allTasks.length}
            />
          ) : (
            <AddMilestoneDialog
              projectId={project.id}
              nextPosition={0}
            />
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-3 rounded-lg border border-border/70 bg-card">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks by title or milestone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-secondary/40 border-border/60"
          />
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Milestone Filter */}
          <select
            aria-label="Filter by Milestone"
            value={selectedMilestone}
            onChange={(e) => setSelectedMilestone(e.target.value)}
            className="h-8 rounded-md border border-border/80 bg-secondary/80 px-2 text-xs text-foreground font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">All Milestones ({project.milestones.length})</option>
            {project.milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            aria-label="Filter by Status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-8 rounded-md border border-border/80 bg-secondary/80 px-2 text-xs text-foreground font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">In Review</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            aria-label="Filter by Priority"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="h-8 rounded-md border border-border/80 bg-secondary/80 px-2 text-xs text-foreground font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Visibility Filter */}
          <select
            aria-label="Filter by Visibility"
            value={selectedVisibility}
            onChange={(e) => setSelectedVisibility(e.target.value)}
            className="h-8 rounded-md border border-border/80 bg-secondary/80 px-2 text-xs text-foreground font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">All Visibility</option>
            <option value="CLIENT_VISIBLE">Client Visible</option>
            <option value="INTERNAL_ONLY">Internal Only</option>
          </select>

          {(searchQuery ||
            selectedMilestone !== "ALL" ||
            selectedStatus !== "ALL" ||
            selectedPriority !== "ALL" ||
            selectedVisibility !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedMilestone("ALL");
                setSelectedStatus("ALL");
                setSelectedPriority("ALL");
                setSelectedVisibility("ALL");
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Tasks Table / Empty State */}
      {project.milestones.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-secondary/20 p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
            <div className="rounded-full bg-secondary/70 p-3 text-muted-foreground border border-border/40">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-foreground">No milestones created yet</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tasks belong to milestones. Create your first milestone before adding tasks.
              </p>
            </div>
            <div className="pt-2">
              <AddMilestoneDialog projectId={project.id} nextPosition={0} />
            </div>
          </div>
        </div>
      ) : allTasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-secondary/20 p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
            <div className="rounded-full bg-secondary/70 p-3 text-muted-foreground border border-border/40">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-foreground">No tasks created yet</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add deliverables and operational items to track progress under your milestones.
              </p>
            </div>
            <div className="pt-2">
              <AddTaskDialog
                milestoneId={project.milestones[0].id}
                milestoneName={project.milestones[0].name}
                projectId={project.id}
                nextPosition={0}
              />
            </div>
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-card p-8 text-center text-xs text-muted-foreground">
          No tasks match the selected filters.
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30 text-[11px] font-medium uppercase tracking-wider text-muted-foreground font-mono">
                  <th className="py-2.5 px-4">Task</th>
                  <th className="py-2.5 px-4">Milestone</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Visibility</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {filteredTasks.map((task) => {
                  const priorityConfig =
                    taskPriorityConfig[task.priority] || taskPriorityConfig.MEDIUM;

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-accent/40 transition-colors group"
                    >
                      {/* Title & Description */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          <div className="font-medium text-foreground">{task.title}</div>
                          {task.description && (
                            <div className="text-muted-foreground text-[11px] line-clamp-1">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Milestone */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground border border-border/50">
                          {task.milestoneName}
                        </span>
                      </td>

                      {/* Status Selector */}
                      <td className="py-3 px-4">
                        <select
                          aria-label={`Change status for ${task.title}`}
                          value={task.status}
                          onChange={(e) =>
                            handleStatusChange(task.id, e.target.value as TaskStatus)
                          }
                          className={cn(
                            "h-7 rounded border px-2 text-[11px] font-medium shadow-sm focus:outline-none focus:ring-1 cursor-pointer",
                            task.status === "COMPLETED"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : task.status === "IN_PROGRESS"
                              ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
                              : task.status === "REVIEW"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                              : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
                          )}
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="REVIEW">In Review</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={priorityConfig.className}>
                          {priorityConfig.label}
                        </Badge>
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4 text-muted-foreground font-mono">
                        {formatDate(task.due_date)}
                      </td>

                      {/* Visibility */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border",
                            task.client_visible
                              ? "border-sky-500/20 bg-sky-500/10 text-sky-400"
                              : "border-zinc-500/20 bg-zinc-500/10 text-zinc-400"
                          )}
                        >
                          {task.client_visible ? (
                            <>
                              <Eye className="h-3 w-3" />
                              <span>Client Visible</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" />
                              <span>Internal</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <EditTaskDialog task={task} projectId={project.id} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                            title="Delete task"
                            aria-label={`Delete task ${task.title}`}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
