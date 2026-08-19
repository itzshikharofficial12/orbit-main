"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createMilestoneSchema, type CreateMilestoneInput } from "../schema";
import { createMilestoneAction } from "../actions";
import type { MilestoneStatus } from "../types";

interface AddMilestoneDialogProps {
  projectId: string;
  nextPosition?: number;
}

export function AddMilestoneDialog({
  projectId,
  nextPosition = 0,
}: AddMilestoneDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<CreateMilestoneInput>({
    project_id: projectId,
    name: "",
    description: "",
    status: "NOT_STARTED",
    position: nextPosition,
  });

  function handleOpen() {
    setFormData({
      project_id: projectId,
      name: "",
      description: "",
      status: "NOT_STARTED",
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

    const validation = createMilestoneSchema.safeParse(formData);
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
    payload.append("project_id", projectId);
    payload.append("name", formData.name);
    if (formData.description) payload.append("description", formData.description);
    payload.append("status", formData.status);
    payload.append("position", String(formData.position));

    const result = await createMilestoneAction(payload);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to create milestone");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setIsOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={handleOpen} size="sm" className="gap-1.5 font-medium text-xs">
        <Plus className="h-3.5 w-3.5" />
        <span>Add Milestone</span>
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
            className="relative w-full max-w-md rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Add Project Milestone
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
              <div className="space-y-1.5">
                <Label htmlFor="milestone_name">Milestone Title *</Label>
                <Input
                  id="milestone_name"
                  placeholder="e.g. Phase 1: Brand Strategy & Identity"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={isLoading}
                  required
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-400">{fieldErrors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="milestone_status">Status</Label>
                <select
                  id="milestone_status"
                  value={formData.status}
                  disabled={isLoading}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as MilestoneStatus,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-card/60 px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="NOT_STARTED">NOT STARTED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="milestone_description">Description (Optional)</Label>
                <textarea
                  id="milestone_description"
                  rows={2}
                  placeholder="Key goals or outputs for this milestone..."
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
                  {isLoading ? "Adding..." : "Add Milestone"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
