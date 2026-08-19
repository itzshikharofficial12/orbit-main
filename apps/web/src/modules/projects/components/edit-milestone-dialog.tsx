"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateMilestoneSchema, type UpdateMilestoneInput } from "../schema";
import { updateMilestoneAction } from "../actions";
import type { Milestone, MilestoneStatus } from "../types";

interface EditMilestoneDialogProps {
  milestone: Milestone;
  projectId: string;
}

export function EditMilestoneDialog({
  milestone,
  projectId,
}: EditMilestoneDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<UpdateMilestoneInput>({
    name: milestone.name,
    description: milestone.description || "",
    status: milestone.status,
  });

  function handleOpen() {
    setFormData({
      name: milestone.name,
      description: milestone.description || "",
      status: milestone.status,
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

    const validation = updateMilestoneSchema.safeParse(formData);
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
    payload.append("name", formData.name);
    if (formData.description) payload.append("description", formData.description);
    payload.append("status", formData.status);

    const result = await updateMilestoneAction(milestone.id, projectId, payload);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to update milestone");
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
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary gap-1"
      >
        <Edit className="h-3 w-3" />
        <span>Edit</span>
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
                Edit Milestone
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
                <Label htmlFor="edit_milestone_name">Milestone Title *</Label>
                <Input
                  id="edit_milestone_name"
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
                <Label htmlFor="edit_milestone_status">Status</Label>
                <select
                  id="edit_milestone_status"
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
                <Label htmlFor="edit_milestone_description">Description (Optional)</Label>
                <textarea
                  id="edit_milestone_description"
                  rows={3}
                  placeholder="Key deliverables and outputs for this phase..."
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
