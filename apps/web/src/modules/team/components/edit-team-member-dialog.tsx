"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Edit2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateTeamMemberSchema } from "../schema";
import { updateTeamMemberAction } from "../actions";
import type { TeamMember, EmployeeJobRole, EmployeeStatus } from "../types";

interface EditTeamMemberDialogProps {
  member: TeamMember;
  trigger?: React.ReactNode;
}

export function EditTeamMemberDialog({
  member,
  trigger,
}: EditTeamMemberDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState({
    id: member.id,
    first_name: member.first_name,
    last_name: member.last_name || "",
    job_role: member.job_role,
    status: member.status,
    phone: member.phone || "",
  });

  React.useEffect(() => {
    setFormData({
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name || "",
      job_role: member.job_role,
      status: member.status,
      phone: member.phone || "",
    });
  }, [member]);

  function handleOpen() {
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

    const validation = updateTeamMemberSchema.safeParse(formData);
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
    payload.append("id", formData.id);
    payload.append("first_name", formData.first_name);
    if (formData.last_name) payload.append("last_name", formData.last_name);
    payload.append("job_role", formData.job_role);
    payload.append("status", formData.status);
    if (formData.phone) payload.append("phone", formData.phone);

    const result = await updateTeamMemberAction(payload);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to update team member");
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
    router.refresh();
  }

  return (
    <>
      {trigger ? (
        <div onClick={handleOpen}>{trigger}</div>
      ) : (
        <Button
          onClick={handleOpen}
          variant="outline"
          size="sm"
          className="h-7 text-xs px-2.5 gap-1.5 border-border/80 hover:bg-secondary"
        >
          <Edit2 className="h-3 w-3" />
          <span>Edit</span>
        </Button>
      )}

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
                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-foreground border border-border/60">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Edit Team Member
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">{member.email}</p>
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
                  <Label htmlFor="edit_first_name" className="text-xs font-medium">
                    First Name *
                  </Label>
                  <Input
                    id="edit_first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, first_name: e.target.value }))
                    }
                    className="h-8 text-xs"
                    disabled={isLoading}
                  />
                  {fieldErrors.first_name && (
                    <p className="text-[11px] text-destructive">{fieldErrors.first_name}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit_last_name" className="text-xs font-medium">
                    Last Name
                  </Label>
                  <Input
                    id="edit_last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, last_name: e.target.value }))
                    }
                    className="h-8 text-xs"
                    disabled={isLoading}
                  />
                  {fieldErrors.last_name && (
                    <p className="text-[11px] text-destructive">{fieldErrors.last_name}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_job_role" className="text-xs font-medium">
                    Job Role *
                  </Label>
                  <select
                    id="edit_job_role"
                    value={formData.job_role}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        job_role: e.target.value as EmployeeJobRole,
                      }))
                    }
                    disabled={isLoading}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="DEVELOPER">Developer</option>
                    <option value="DESIGNER">Designer</option>
                    <option value="CONTENT">Content</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="SALES">Sales</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {fieldErrors.job_role && (
                    <p className="text-[11px] text-destructive">{fieldErrors.job_role}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit_status" className="text-xs font-medium">
                    Status *
                  </Label>
                  <select
                    id="edit_status"
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
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_phone" className="text-xs font-medium">
                  Phone Number (Optional)
                </Label>
                <Input
                  id="edit_phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="h-8 text-xs font-mono"
                  disabled={isLoading}
                />
              </div>

              {/* Warning if deactivating a member with assigned clients */}
              {formData.status === "INACTIVE" && member.assigned_clients_count > 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200 space-y-1">
                  <p className="font-semibold">Note on deactivation:</p>
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">
                    This member is currently assigned to {member.assigned_clients_count} active client(s).
                    Setting status to Inactive preserves historical assignments, but they will not be selectable for new client assignments until reactivated.
                  </p>
                </div>
              )}

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
