"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateProjectSchema, type UpdateProjectInput } from "../schema";
import { updateProjectAction } from "../actions";
import type { Project, ServiceType, ProjectStatus } from "../types";

interface EditProjectDialogProps {
  project: Project;
}

export function EditProjectDialog({ project }: EditProjectDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<UpdateProjectInput>({
    name: project.name,
    service_type: project.service_type,
    description: project.description || "",
    status: project.status,
    start_date: project.start_date || "",
    target_date: project.target_date || "",
  });

  function handleOpen() {
    setFormData({
      name: project.name,
      service_type: project.service_type,
      description: project.description || "",
      status: project.status,
      start_date: project.start_date || "",
      target_date: project.target_date || "",
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

    const validation = updateProjectSchema.safeParse(formData);
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
    payload.append("service_type", formData.service_type);
    if (formData.description) payload.append("description", formData.description);
    payload.append("status", formData.status);
    if (formData.start_date) payload.append("start_date", formData.start_date);
    if (formData.target_date) payload.append("target_date", formData.target_date);

    const result = await updateProjectAction(project.id, payload);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to update project");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setIsOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="gap-1.5 text-xs font-normal">
        <Edit className="h-3.5 w-3.5" />
        <span>Edit Project</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={handleClose}
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border/80 bg-card p-7 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-5 border-b border-border/40">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Edit Project Details
                </h2>
                <p className="text-xs text-muted-foreground">
                  Update engagement parameters for {project.name}.
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

            <form onSubmit={handleSubmit} className="space-y-4.5 mt-5">
              <div className="space-y-1.5">
                <Label htmlFor="edit_project_name">Project Name *</Label>
                <Input
                  id="edit_project_name"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_project_service">Service System *</Label>
                  <select
                    id="edit_project_service"
                    value={formData.service_type}
                    disabled={isLoading}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        service_type: e.target.value as ServiceType,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-card/60 px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    required
                  >
                    <option value="BRAND_FOUNDATION">Brand Foundation System</option>
                    <option value="SAAS_WEBSITE">SaaS Website Development System</option>
                    <option value="GROWTH_ENGINE">Growth Engine</option>
                    <option value="AI_OPERATIONS">AI Operations</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit_project_status">Status</Label>
                  <select
                    id="edit_project_status"
                    value={formData.status}
                    disabled={isLoading}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as ProjectStatus,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-card/60 px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="PLANNING">PLANNING</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="IN_REVIEW">IN_REVIEW</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_start_date">Start Date</Label>
                  <Input
                    id="edit_start_date"
                    type="date"
                    value={formData.start_date || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, start_date: e.target.value }))
                    }
                    disabled={isLoading}
                  />
                  {fieldErrors.start_date && (
                    <p className="text-xs text-red-400">{fieldErrors.start_date}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit_target_date">Target Date</Label>
                  <Input
                    id="edit_target_date"
                    type="date"
                    value={formData.target_date || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, target_date: e.target.value }))
                    }
                    disabled={isLoading}
                  />
                  {fieldErrors.target_date && (
                    <p className="text-xs text-red-400">{fieldErrors.target_date}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_description">Scope & Description</Label>
                <textarea
                  id="edit_description"
                  rows={3}
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  disabled={isLoading}
                  className="w-full rounded-md border border-input bg-card/60 px-3.5 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {fieldErrors.description && (
                  <p className="text-xs text-red-400">{fieldErrors.description}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
