"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createDeliverableSchema,
  type CreateDeliverableInput,
} from "../schema";
import { createDeliverableAction } from "../actions";
import type { Milestone } from "@/lib/supabase/types";

interface AddDeliverableDialogProps {
  projectId: string;
  milestones: Milestone[];
}

export function AddDeliverableDialog({
  projectId,
  milestones,
}: AddDeliverableDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<CreateDeliverableInput>({
    title: "",
    description: null,
    milestone_id: null,
    status: "PLANNED",
    expected_delivery_date: null,
    url: null,
    client_visible: true,
    notes: null,
  });

  function handleOpen() {
    setFormData({
      title: "",
      description: null,
      milestone_id: null,
      status: "PLANNED",
      expected_delivery_date: null,
      url: null,
      client_visible: true,
      notes: null,
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

    const validation = createDeliverableSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        const field = err.path.join(".");
        if (!errors[field]) errors[field] = err.message;
      });
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    const payload = new FormData();
    payload.append("title", formData.title);
    if (formData.description) payload.append("description", formData.description);
    if (formData.milestone_id) payload.append("milestone_id", formData.milestone_id);
    payload.append("status", formData.status);
    if (formData.expected_delivery_date) payload.append("expected_delivery_date", formData.expected_delivery_date);
    if (formData.url) payload.append("url", formData.url);
    payload.append("client_visible", formData.client_visible ? "true" : "false");
    if (formData.notes) payload.append("notes", formData.notes);

    const result = await createDeliverableAction(projectId, payload);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to create deliverable");
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
        onClick={handleOpen}
        size="sm"
        className="gap-1.5 font-medium text-xs bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Add Deliverable</span>
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
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    Add Deliverable
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Create a planned deliverable or output for this project engagement.
                  </p>
                </div>
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
                <Label htmlFor="deliv_title">Deliverable Title *</Label>
                <Input
                  id="deliv_title"
                  placeholder="e.g. Brand Strategy Guidelines"
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  disabled={isLoading}
                  required
                />
                {fieldErrors.title && (
                  <p className="text-xs text-red-400">{fieldErrors.title}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deliv_desc">Description</Label>
                <Textarea
                  id="deliv_desc"
                  placeholder="Brief summary of what this deliverable includes..."
                  value={formData.description || ""}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value || null,
                    }))
                  }
                  disabled={isLoading}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="deliv_milestone">Associated Milestone</Label>
                  <select
                    id="deliv_milestone"
                    value={formData.milestone_id || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        milestone_id: e.target.value || null,
                      }))
                    }
                    disabled={isLoading}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  >
                    <option value="">None / Project-wide</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="deliv_status">Initial Status</Label>
                  <select
                    id="deliv_status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as CreateDeliverableInput["status"],
                      }))
                    }
                    disabled={isLoading}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="READY_FOR_REVIEW">Ready for Review</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="deliv_date">Expected Delivery Date</Label>
                  <Input
                    id="deliv_date"
                    type="date"
                    value={formData.expected_delivery_date || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        expected_delivery_date: e.target.value || null,
                      }))
                    }
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="deliv_url">Delivery URL (Optional for Draft)</Label>
                  <Input
                    id="deliv_url"
                    type="url"
                    placeholder="https://figma.com/... or https://drive.google.com/..."
                    value={formData.url || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        url: e.target.value || null,
                      }))
                    }
                    disabled={isLoading}
                  />
                  {fieldErrors.url && (
                    <p className="text-xs text-red-400">{fieldErrors.url}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deliv_notes">Internal Notes</Label>
                <Textarea
                  id="deliv_notes"
                  placeholder="Internal notes for Celestia Studios team (never visible to client)..."
                  value={formData.notes || ""}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      notes: e.target.value || null,
                    }))
                  }
                  disabled={isLoading}
                  rows={2}
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.client_visible}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        client_visible: e.target.checked,
                      }))
                    }
                    disabled={isLoading}
                    className="h-4 w-4 rounded border-border bg-secondary/50 text-primary focus:ring-primary focus:ring-offset-background"
                  />
                  <div>
                    <span className="text-xs font-medium text-foreground block">
                      Visible in Client Timeline
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Allow client to see this deliverable as upcoming or ready for review.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
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
                  {isLoading ? "Saving..." : "Add Deliverable"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
