"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createProjectSchema, type CreateProjectInput } from "../schema";
import { createProjectAction } from "../actions";
import type { ServiceType, ProjectStatus } from "../types";

interface AddProjectDialogProps {
  clients?: Array<{ id: string; name: string }>;
  preselectedClientId?: string;
  triggerButtonText?: string;
}

export function AddProjectDialog({
  clients = [],
  preselectedClientId,
  triggerButtonText = "New Project",
}: AddProjectDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<CreateProjectInput>({
    name: "",
    client_id: preselectedClientId || (clients[0]?.id || ""),
    service_type: "BRAND_FOUNDATION",
    description: "",
    status: "PLANNING",
    start_date: "",
    target_date: "",
  });

  // Keep client_id in sync if preselectedClientId changes
  React.useEffect(() => {
    if (preselectedClientId) {
      setFormData((prev) => ({ ...prev, client_id: preselectedClientId }));
    } else if (clients.length > 0) {
      setFormData((prev) => {
        if (!prev.client_id) {
          return { ...prev, client_id: clients[0].id };
        }
        return prev;
      });
    }
  }, [preselectedClientId, clients]);

  function resetForm() {
    setFormData({
      name: "",
      client_id: preselectedClientId || (clients[0]?.id || ""),
      service_type: "BRAND_FOUNDATION",
      description: "",
      status: "PLANNING",
      start_date: "",
      target_date: "",
    });
    setErrorMessage(null);
    setFieldErrors({});
  }

  function handleOpen() {
    resetForm();
    setIsOpen(true);
  }

  function handleClose() {
    if (isLoading) return;
    setIsOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setFieldErrors({});

    // Client-side Zod validation
    const validation = createProjectSchema.safeParse(formData);
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
    payload.append("client_id", formData.client_id);
    payload.append("service_type", formData.service_type);
    if (formData.description) payload.append("description", formData.description);
    payload.append("status", formData.status);
    if (formData.start_date) payload.append("start_date", formData.start_date);
    if (formData.target_date) payload.append("target_date", formData.target_date);

    const result = await createProjectAction(payload);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to create project");
      if (result.fieldErrors) {
        const mapped: Record<string, string> = {};
        Object.entries(result.fieldErrors).forEach(([k, v]) => {
          mapped[k] = v[0] || "";
        });
        setFieldErrors(mapped);
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setIsOpen(false);

    if (result.data?.id) {
      router.push(`/hq/projects/${result.data.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <Button onClick={handleOpen} className="gap-2 font-medium">
        <Plus className="h-4 w-4" />
        <span>{triggerButtonText}</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          {/* Dialog Container */}
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border/80 bg-card p-7 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-5 border-b border-border/40">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  New Project
                </h2>
                <p className="text-xs text-muted-foreground">
                  Create a new service engagement project for Celestia Studios.
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

            {/* Error alert */}
            {errorMessage && (
              <div className="mt-4">
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4.5 mt-5">
              {/* Project Name */}
              <div className="space-y-1.5">
                <Label htmlFor="project_name">Project Name *</Label>
                <Input
                  id="project_name"
                  placeholder="e.g. Brand Foundation System"
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

              {/* Client & Service Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Client Select */}
                <div className="space-y-1.5">
                  <Label htmlFor="project_client">Client Account *</Label>
                  <select
                    id="project_client"
                    value={formData.client_id}
                    disabled={isLoading || Boolean(preselectedClientId)}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, client_id: e.target.value }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-card/60 px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-75 cursor-pointer"
                    required
                  >
                    {clients.length === 0 && (
                      <option value="">No clients available</option>
                    )}
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.client_id && (
                    <p className="text-xs text-red-400">{fieldErrors.client_id}</p>
                  )}
                </div>

                {/* Service Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="project_service">Service System *</Label>
                  <select
                    id="project_service"
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
              </div>

              {/* Status & Dates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Status */}
                <div className="space-y-1.5">
                  <Label htmlFor="project_status">Initial Status</Label>
                  <select
                    id="project_status"
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

                {/* Start Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
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

                {/* Target Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="target_date">Target Date</Label>
                  <Input
                    id="target_date"
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

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description">Scope & Description</Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Outline key deliverables, scope, and objectives..."
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  disabled={isLoading}
                  className="w-full rounded-md border border-input bg-card/60 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {fieldErrors.description && (
                  <p className="text-xs text-red-400">{fieldErrors.description}</p>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || clients.length === 0}>
                  {isLoading ? "Creating Project..." : "Create Project"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
