"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateTaskSchema, type UpdateTaskInput } from "../schema";
import { updateTaskAction } from "../actions";
import type { Task, TaskStatus, TaskPriority } from "../types";

interface EditTaskDialogProps {
  task: Task;
  projectId: string;
}

export function EditTaskDialog({ task, projectId }: EditTaskDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<UpdateTaskInput>({
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority,
    due_date: task.due_date || "",
    client_visible: task.client_visible,
  });

  function handleOpen() {
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || "",
      client_visible: task.client_visible,
    });
    setErrorMessage(null);
    setFieldErrors({});
    setIsOpen(true);
  }

  function handleClose() {
    if (isLoading) return;
    setIsOpen(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setFieldErrors({});

    const validation = updateTaskSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!errors[field]) errors[field] = err.message;
      });
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    const payload = new FormData();
    payload.append("title", formData.title);
    if (formData.description) payload.append("description", formData.description);
    payload.append("status", formData.status);
    payload.append("priority", formData.priority);
    if (formData.due_date) payload.append("due_date", formData.due_date);
    payload.append("client_visible", String(formData.client_visible));

    const result = await updateTaskAction(task.id, projectId, payload);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to update task");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setIsOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        title="Edit task"
        aria-label={`Edit task ${task.title}`}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
      >
        <Edit className="h-3.5 w-3.5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Edit Task
              </h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4">
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Task Title */}
              <div className="space-y-1.5">
                <Label htmlFor="edit_task_title">Task Title *</Label>
                <Input
                  id="edit_task_title"
                  placeholder="e.g. Design responsive landing page"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  disabled={isLoading}
                  required
                />
                {fieldErrors.title && (
                  <p className="text-xs text-red-400">{fieldErrors.title}</p>
                )}
              </div>

              {/* Status & Priority Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_task_status">Status</Label>
                  <select
                    id="edit_task_status"
                    value={formData.status}
                    disabled={isLoading}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as TaskStatus,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-card/60 px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit_task_priority">Priority</Label>
                  <select
                    id="edit_task_priority"
                    value={formData.priority}
                    disabled={isLoading}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priority: e.target.value as TaskPriority,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-card/60 px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <Label htmlFor="edit_task_due_date">Due Date</Label>
                <Input
                  id="edit_task_due_date"
                  type="date"
                  value={formData.due_date || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, due_date: e.target.value }))
                  }
                  disabled={isLoading}
                />
                {fieldErrors.due_date && (
                  <p className="text-xs text-red-400">{fieldErrors.due_date}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="edit_task_description">Description (Optional)</Label>
                <textarea
                  id="edit_task_description"
                  rows={3}
                  placeholder="Task details, specifications, or deliverable requirements..."
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  disabled={isLoading}
                  className="w-full rounded-md border border-input bg-card/60 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Client Visibility Toggle */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-secondary/20">
                <input
                  type="checkbox"
                  id="edit_task_client_visible"
                  checked={formData.client_visible}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      client_visible: e.target.checked,
                    }))
                  }
                  disabled={isLoading}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer mt-0.5"
                />
                <div className="space-y-0.5">
                  <Label
                    htmlFor="edit_task_client_visible"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Visible to client
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    When enabled, this task and its status are displayed in the client portal. When disabled, it remains visible only to Celestia Studios team members.
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
