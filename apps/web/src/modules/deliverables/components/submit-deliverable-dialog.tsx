"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, X, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { submitDeliverableForReviewAction } from "../actions";
import type { DeliverableWithMilestone } from "../types";

interface SubmitDeliverableDialogProps {
  deliverable: DeliverableWithMilestone;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SubmitDeliverableDialog({
  deliverable,
  projectId,
  isOpen,
  onClose,
}: SubmitDeliverableDialogProps) {
  const router = useRouter();
  const [url, setUrl] = React.useState(deliverable.url || "");
  const [expectedDate, setExpectedDate] = React.useState(
    deliverable.expected_delivery_date || ""
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setUrl(deliverable.url || "");
    setExpectedDate(deliverable.expected_delivery_date || "");
    setErrorMessage(null);
  }, [deliverable]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!url.trim()) {
      setErrorMessage("Please provide a valid delivery URL (Figma, Notion, Google Drive, live website, etc.).");
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append("url", url.trim());
    if (expectedDate) {
      formData.append("expected_delivery_date", expectedDate);
    }

    const result = await submitDeliverableForReviewAction(
      deliverable.id,
      projectId,
      formData
    );

    if (!result.success) {
      setErrorMessage(result.error || "Failed to submit deliverable for review.");
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
        className="relative w-full max-w-md rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Submit for Client Review
              </h2>
              <p className="text-xs text-muted-foreground">
                {deliverable.submission_count > 0
                  ? `Submitting Revision #${deliverable.submission_count + 1}`
                  : "Submit final output for client review & approval"}
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

        <div className="mt-4 p-3 rounded-lg bg-secondary/20 border border-border/40 space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
            Deliverable
          </div>
          <div className="text-sm font-semibold text-foreground">
            {deliverable.title}
          </div>
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
            <Label htmlFor="submit_url">Delivery URL / File Link *</Label>
            <div className="relative">
              <Input
                id="submit_url"
                type="url"
                placeholder="https://figma.com/... or https://drive.google.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                required
                className="pr-8"
              />
              <ExternalLink className="h-3.5 w-3.5 absolute right-2.5 top-3 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              The client will be given instant access to view and review this URL.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="submit_date">Target / Delivery Date</Label>
            <Input
              id="submit_date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Submitting changes the status to <strong>READY FOR REVIEW</strong>, makes the link accessible to the client, and sends a review notification.
            </span>
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
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isLoading ? "Submitting..." : "Submit for Review"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
