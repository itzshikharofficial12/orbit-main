"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createTaskSchema, type CreateTaskInput } from "../schema";
import { createTaskAction } from "../actions";
import type { TaskStatus, TaskPriority } from "../types";

interface AddTaskDialogProps {
  milestoneId: string;
  milestoneName: string;
  projectId: string;
  nextPosition?: number;
}

export function AddTaskDialog({
  milestoneId,
  milestoneName,
  projectId,
  nextPosition = 0,
}: AddTaskDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<CreateTaskInput>({
    milestone_id: milestoneId,
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    due_date: "",
    client_visible: true,
    position: nextPosition,
  });

  function handleOpen() {
    setFormData({
      milestone_id: milestoneId,
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      due_date: "",
      client_visible: true,
      position: nextPosition,
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

    const validation = createTaskSchema.safeParse(formData);
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
    payload.append("milestone_id", milestoneId);
    payload.append("title", formData.title);
    if (formData.description) payload.append("description", formData.description);
    payload.append("status", formData.status);
    payload.append("priority", formData.priority);
    if (formData.due_date) payload.append("due_date", formData.due_date);
    payload.append("client_visible", String(formData.client_visible));
    payload.append("position", String(formData.position));

    const result = await createTaskAction(payload, projectId);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to create task");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setIsOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary/60 transition-colors cursor-pointer"
        title="Add task to milestone"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Add Task</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={handleClose}
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="space-y-0.5">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  New Task
                </h2>
                <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                  Under: {milestoneName}
                </p>
              </div>
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
              <div className="space-y-1.5">
                <Label htmlFor="task_title">Task Title *</Label>
                <Input
                  id="task_title"
                  placeholder="e.g. Design brand moodboards and color palettes"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="task_priority">Priority</Label>
                  <select
                    id="task_priority"
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
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="task_status">Status</Label>
                  <select
                    id="task_status"
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
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="task_due_date">Due Date</Label>
                  <Input
                    id="task_due_date"
                    type="date"
                    value={formData.due_date || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, due_date: e.target.value }))
                    }
                    disabled={isLoading}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="client_visible"
                    checked={formData.client_visible}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        client_visible: e.target.checked,
                      }))
                    }
                    disabled={isLoading}
                    className="h-4 w-4 rounded-sm border-border bg-card text-primary focus:ring-1 focus:ring-ring cursor-pointer"
                  />
                  <label
                    htmlFor="client_visible"
                    className="text-xs text-muted-foreground select-none cursor-pointer"
                  >
                    Visible to Client
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task_description">Description (Optional)</Label>
                <textarea
                  id="task_description"
                  rows={2}
                  placeholder="Task details or acceptance criteria..."
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  disabled={isLoading}
                  className="w-full rounded-md border border-input bg-card/60 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

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
                  {isLoading ? "Adding Task..." : "Add Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
