"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClientSchema, type CreateClientInput } from "../schema";
import { createClientAction } from "../actions";
import type { ClientStatus } from "../types";

export function AddClientDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<CreateClientInput>({
    name: "",
    primary_contact_name: "",
    primary_contact_email: "",
    primary_contact_phone: "",
    status: "ACTIVE",
    notes: "",
  });

  function resetForm() {
    setFormData({
      name: "",
      primary_contact_name: "",
      primary_contact_email: "",
      primary_contact_phone: "",
      status: "ACTIVE",
      notes: "",
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
    const validation = createClientSchema.safeParse(formData);
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
    payload.append("primary_contact_name", formData.primary_contact_name);
    payload.append("primary_contact_email", formData.primary_contact_email);
    if (formData.primary_contact_phone) {
      payload.append("primary_contact_phone", formData.primary_contact_phone);
    }
    payload.append("status", formData.status);
    if (formData.notes) {
      payload.append("notes", formData.notes);
    }

    const result = await createClientAction(payload);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to create client");
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

    if (result.client?.id) {
      router.push(`/hq/clients/${result.client.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <Button onClick={handleOpen} className="gap-2 font-medium">
        <Plus className="h-4 w-4" />
        <span>Add Client</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={handleClose}
          />

          {/* Dialog Container */}
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-xl border border-border/80 bg-card p-7 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-5 border-b border-border/40">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Add New Client
                </h2>
                <p className="text-xs text-muted-foreground">
                  Create a new client account in Orbit for Celestia Studios engagements.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="mt-4">
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4.5 mt-5">
              {/* Client Name */}
              <div className="space-y-1.5">
                <Label htmlFor="client_name">Client / Company Name *</Label>
                <Input
                  id="client_name"
                  placeholder="e.g. Aromaras"
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

              {/* Primary Contact Name */}
              <div className="space-y-1.5">
                <Label htmlFor="contact_name">Primary Contact Name *</Label>
                <Input
                  id="contact_name"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.primary_contact_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      primary_contact_name: e.target.value,
                    }))
                  }
                  disabled={isLoading}
                  required
                />
                {fieldErrors.primary_contact_name && (
                  <p className="text-xs text-red-400">
                    {fieldErrors.primary_contact_name}
                  </p>
                )}
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contact_email">Email Address *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    placeholder="contact@company.com"
                    value={formData.primary_contact_email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        primary_contact_email: e.target.value,
                      }))
                    }
                    disabled={isLoading}
                    required
                  />
                  {fieldErrors.primary_contact_email && (
                    <p className="text-xs text-red-400">
                      {fieldErrors.primary_contact_email}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact_phone">Phone Number</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.primary_contact_phone || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        primary_contact_phone: e.target.value,
                      }))
                    }
                    disabled={isLoading}
                  />
                  {fieldErrors.primary_contact_phone && (
                    <p className="text-xs text-red-400">
                      {fieldErrors.primary_contact_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="client_status">Engagement Status</Label>
                <select
                  id="client_status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as ClientStatus,
                    }))
                  }
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-card/60 px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="ACTIVE">ACTIVE — Ongoing engagements</option>
                  <option value="PAUSED">PAUSED — Temporarily on hold</option>
                  <option value="COMPLETED">COMPLETED — Engagement finished</option>
                  <option value="ARCHIVED">ARCHIVED — Inactive record</option>
                </select>
              </div>

              {/* Actions Footer */}
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
                  {isLoading ? "Creating Client..." : "Create Client"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
