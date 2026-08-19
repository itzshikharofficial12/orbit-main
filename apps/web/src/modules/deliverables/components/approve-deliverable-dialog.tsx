"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { approveDeliverableAction } from "../actions";
import type { DeliverableWithMilestone } from "../types";

interface ApproveDeliverableDialogProps {
  deliverable: DeliverableWithMilestone;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ApproveDeliverableDialog({
  deliverable,
  projectId,
  isOpen,
  onClose,
}: ApproveDeliverableDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (!isOpen) return null;

  async function handleApprove() {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await approveDeliverableAction(deliverable.id, projectId);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to approve deliverable.");
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
            <div className="h-8 w-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Approve this deliverable?
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
          By approving this deliverable, you confirm that you have reviewed the submitted work and accept it for this project milestone.
        </p>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

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
            type="button"
            size="sm"
            onClick={handleApprove}
            disabled={isLoading}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{isLoading ? "Approving..." : "Approve"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
