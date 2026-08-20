"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createTeamMemberSchema } from "../schema";
import { createTeamMemberAction } from "../actions";
import type { EmployeeJobRole, EmployeeStatus } from "../types";

export function AddTeamMemberDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    job_role: "PROJECT_MANAGER" as EmployeeJobRole,
    department: "",
    is_project_manager: true,
    status: "ACTIVE" as EmployeeStatus,
    phone: "",
  });

  function resetForm() {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      job_role: "PROJECT_MANAGER",
      department: "",
      is_project_manager: true,
      status: "ACTIVE",
      phone: "",
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

    const validation = createTeamMemberSchema.safeParse(formData);
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
    payload.append("first_name", formData.first_name);
    if (formData.last_name) payload.append("last_name", formData.last_name);
    payload.append("email", formData.email);
    payload.append("job_role", formData.job_role);
    if (formData.department) payload.append("department", formData.department);
    payload.append("is_project_manager", String(formData.is_project_manager));
    payload.append("status", formData.status);
    if (formData.phone) payload.append("phone", formData.phone);

    const result = await createTeamMemberAction(payload);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to add team member");
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
    resetForm();
    router.refresh();
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        size="sm"
        className="h-8 text-xs font-semibold px-3 gap-1.5 shadow-sm"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Add Team Member</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl z-10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Add Team Member</h3>
                  <p className="text-xs text-muted-foreground">
                    Create an employee profile for client project management.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name" className="text-xs font-medium">
                    First Name *
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, first_name: e.target.value }))
                    }
                    placeholder="e.g. Mehak"
                    className="h-8 text-xs"
                    disabled={isLoading}
                  />
                  {fieldErrors.first_name && (
                    <p className="text-[11px] text-destructive">{fieldErrors.first_name}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="last_name" className="text-xs font-medium">
                    Last Name
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, last_name: e.target.value }))
                    }
                    placeholder="e.g. Sharma"
                    className="h-8 text-xs"
                    disabled={isLoading}
                  />
                  {fieldErrors.last_name && (
                    <p className="text-[11px] text-destructive">{fieldErrors.last_name}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">
                  Work Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="e.g. mehak@celestiastudios.in"
                  className="h-8 text-xs font-mono"
                  disabled={isLoading}
                />
                {fieldErrors.email && (
                  <p className="text-[11px] text-destructive">{fieldErrors.email}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="job_role" className="text-xs font-medium">
                    Job Function / Role *
                  </Label>
                  <select
                    id="job_role"
                    value={formData.job_role}
                    onChange={(e) => {
                      const newRole = e.target.value as EmployeeJobRole;
                      setFormData((prev) => ({
                        ...prev,
                        job_role: newRole,
                        is_project_manager: newRole === "PROJECT_MANAGER" ? true : prev.is_project_manager,
                      }));
                    }}
                    disabled={isLoading}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="DEVELOPER">Developer</option>
                    <option value="DESIGNER">Designer</option>
                    <option value="CONTENT">Content Specialist</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="SALES">Sales</option>
                    <option value="OTHER">Executive / General</option>
                  </select>
                  {fieldErrors.job_role && (
                    <p className="text-[11px] text-destructive">{fieldErrors.job_role}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="department" className="text-xs font-medium">
                    Department (Optional)
                  </Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, department: e.target.value }))
                    }
                    placeholder="e.g. Admin, Content, Engineering"
                    className="h-8 text-xs"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-xs font-medium">
                    Status *
                  </Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as EmployeeStatus,
                      }))
                    }
                    disabled={isLoading}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-medium">
                    Phone Number (Optional)
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="e.g. +91 98765 43210"
                    className="h-8 text-xs font-mono"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* PM Eligibility Checkbox */}
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="is_project_manager"
                  checked={formData.is_project_manager}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_project_manager: e.target.checked,
                    }))
                  }
                  disabled={isLoading}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                />
                <div className="space-y-0.5 cursor-pointer" onClick={() => setFormData((prev) => ({ ...prev, is_project_manager: !prev.is_project_manager }))}>
                  <Label htmlFor="is_project_manager" className="text-xs font-semibold text-foreground cursor-pointer">
                    Eligible for Client Project Manager Assignment
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    When enabled, this team member will be available in the PM assignment dropdown across client workspaces regardless of their primary job function.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="h-8 text-xs px-3"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                  className="h-8 text-xs px-4 font-semibold shadow-sm"
                >
                  {isLoading ? "Adding Member..." : "Add Member"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
