"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  updateDeliverableSchema,
  type UpdateDeliverableInput,
} from "../schema";
import { updateDeliverableAction } from "../actions";
import type { DeliverableWithMilestone } from "../types";
import type { Milestone } from "@/lib/supabase/types";

interface EditDeliverableDialogProps {
  deliverable: DeliverableWithMilestone;
  projectId: string;
  milestones: Milestone[];
  isOpen: boolean;
  onClose: () => void;
}

export function EditDeliverableDialog({
  deliverable,
  projectId,
  milestones,
  isOpen,
  onClose,
}: EditDeliverableDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<UpdateDeliverableInput>({
    id: deliverable.id,
    title: deliverable.title,
    description: deliverable.description,
    milestone_id: deliverable.milestone_id,
    status: deliverable.status,
    expected_delivery_date: deliverable.expected_delivery_date,
    url: deliverable.url,
    client_visible: deliverable.client_visible,
    notes: deliverable.notes,
  });

  React.useEffect(() => {
    setFormData({
      id: deliverable.id,
      title: deliverable.title,
      description: deliverable.description,
      milestone_id: deliverable.milestone_id,
      status: deliverable.status,
      expected_delivery_date: deliverable.expected_delivery_date,
      url: deliverable.url,
      client_visible: deliverable.client_visible,
      notes: deliverable.notes,
    });
    setErrorMessage(null);
    setFieldErrors({});
  }, [deliverable]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setFieldErrors({});

    const validation = updateDeliverableSchema.safeParse(formData);
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
    payload.append("title", formData.title);
    if (formData.description) payload.append("description", formData.description);
    if (formData.milestone_id) payload.append("milestone_id", formData.milestone_id);
    payload.append("status", formData.status);
    if (formData.expected_delivery_date) payload.append("expected_delivery_date", formData.expected_delivery_date);
    if (formData.url) payload.append("url", formData.url);
    payload.append("client_visible", formData.client_visible ? "true" : "false");
    if (formData.notes) payload.append("notes", formData.notes);

    const result = await updateDeliverableAction(deliverable.id, projectId, payload);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to update deliverable");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
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
                Edit Deliverable
              </h2>
              <p className="text-xs text-muted-foreground">
                Update details, expected delivery date, or notes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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
            <Label htmlFor="edit_deliv_title">Deliverable Title *</Label>
            <Input
              id="edit_deliv_title"
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
            <Label htmlFor="edit_deliv_desc">Description</Label>
            <Textarea
              id="edit_deliv_desc"
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
              <Label htmlFor="edit_deliv_milestone">Associated Milestone</Label>
              <select
                id="edit_deliv_milestone"
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
              <Label htmlFor="edit_deliv_status">Delivery Status</Label>
              <select
                id="edit_deliv_status"
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as UpdateDeliverableInput["status"],
                  }))
                }
                disabled={isLoading}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              >
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="READY_FOR_REVIEW">Ready for Review</option>
                <option value="CHANGES_REQUESTED">Changes Requested</option>
                <option value="APPROVED">Approved</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_deliv_date">Expected Delivery Date</Label>
              <Input
                id="edit_deliv_date"
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
              <Label htmlFor="edit_deliv_url">Delivery URL</Label>
              <Input
                id="edit_deliv_url"
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
            <Label htmlFor="edit_deliv_notes">Internal Notes</Label>
            <Textarea
              id="edit_deliv_notes"
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
                  Visible to Client
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Allow client to view this deliverable in their project workspace.
                </span>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
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
  );
}
