"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requestDeliverableChangesAction } from "../actions";
import type { DeliverableWithMilestone } from "../types";

interface RequestChangesDialogProps {
  deliverable: DeliverableWithMilestone;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RequestChangesDialog({
  deliverable,
  projectId,
  isOpen,
  onClose,
}: RequestChangesDialogProps) {
  const router = useRouter();
  const [feedback, setFeedback] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFeedback("");
    setErrorMessage(null);
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!feedback.trim() || feedback.trim().length < 3) {
      setErrorMessage("Please describe what changes or revisions are needed.");
      return;
    }

    setIsLoading(true);

    const result = await requestDeliverableChangesAction(
      deliverable.id,
      projectId,
      feedback.trim()
    );

    if (!result.success) {
      setErrorMessage(result.error || "Failed to submit change request.");
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
        className="relative w-full max-w-md rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-orange-950/60 border border-orange-800/60 flex items-center justify-center text-orange-400">
              <MessageSquarePlus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Request Changes
              </h2>
              <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                {deliverable.title}
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

        <p className="text-xs text-muted-foreground leading-relaxed">
          Tell Celestia Studios what needs to be changed. Your feedback will be shared directly with the project lead to prepare revisions.
        </p>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="change_feedback">Revision Details *</Label>
            <Textarea
              id="change_feedback"
              placeholder="Describe the adjustments or specific feedback for this deliverable..."
              value={feedback}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFeedback(e.target.value)
              }
              rows={4}
              disabled={isLoading}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white font-medium"
            >
              <span>{isLoading ? "Submitting..." : "Submit Request"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
