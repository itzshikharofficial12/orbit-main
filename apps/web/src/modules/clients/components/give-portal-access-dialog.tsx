"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { inviteClientUserSchema, type InviteClientUserInput } from "../schema";
import { inviteClientUserAction } from "../actions";

interface GivePortalAccessDialogProps {
  clientId: string;
  defaultEmail?: string;
  defaultName?: string;
}

export function GivePortalAccessDialog({
  clientId,
  defaultEmail = "",
  defaultName = "",
}: GivePortalAccessDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const nameParts = defaultName.trim().split(" ");
  const defaultFirstName = nameParts[0] || "";
  const defaultLastName = nameParts.slice(1).join(" ") || "";

  const [formData, setFormData] = React.useState<InviteClientUserInput>({
    first_name: defaultFirstName,
    last_name: defaultLastName,
    email: defaultEmail,
  });

  function handleOpen() {
    setFormData({
      first_name: defaultFirstName,
      last_name: defaultLastName,
      email: defaultEmail,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
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
    setSuccessMessage(null);
    setFieldErrors({});

    const validation = inviteClientUserSchema.safeParse(formData);
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

    const result = await inviteClientUserAction(clientId, payload);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to grant portal access");
      setIsLoading(false);
      return;
    }

    setSuccessMessage(result.message || "Portal access configured successfully.");
    setIsLoading(false);
    setTimeout(() => {
      setIsOpen(false);
      router.refresh();
    }, 1200);
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        size="sm"
        className="gap-1.5 font-medium text-xs bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <KeyRound className="h-3.5 w-3.5" />
        <span>Give Portal Access</span>
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
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Give Portal Access
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Grant client dashboard and project workspace access.
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

            {successMessage && (
              <div className="mt-4">
                <Alert className="border-emerald-900/60 bg-emerald-950/40 text-emerald-300 text-xs">
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="invite_first_name">First Name *</Label>
                  <Input
                    id="invite_first_name"
                    placeholder="e.g. Aarav"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, first_name: e.target.value }))
                    }
                    disabled={isLoading}
                    required
                  />
                  {fieldErrors.first_name && (
                    <p className="text-xs text-red-400">{fieldErrors.first_name}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite_last_name">Last Name</Label>
                  <Input
                    id="invite_last_name"
                    placeholder="e.g. Sharma"
                    value={formData.last_name || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, last_name: e.target.value }))
                    }
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite_email">Email Address *</Label>
                <Input
                  id="invite_email"
                  type="email"
                  placeholder="e.g. client@aromaras.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  disabled={isLoading}
                  required
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-400">{fieldErrors.email}</p>
                )}
              </div>

              <div className="p-3 rounded-lg border border-border/60 bg-secondary/20 text-xs text-muted-foreground leading-relaxed">
                This user will receive instructions to access the Orbit Client Portal and will only see projects and deliverables assigned to this client.
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
                  {isLoading ? "Provisioning..." : "Create Access"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
