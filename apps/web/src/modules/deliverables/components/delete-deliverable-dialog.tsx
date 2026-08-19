"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteDeliverableAction } from "../actions";

interface DeleteDeliverableDialogProps {
  deliverableId: string;
  deliverableTitle: string;
  projectId: string;
  onClose: () => void;
}

export function DeleteDeliverableDialog({
  deliverableId,
  deliverableTitle,
  projectId,
  onClose,
}: DeleteDeliverableDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleDelete() {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await deleteDeliverableAction(deliverableId, projectId);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to delete deliverable");
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
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-red-950/40 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
            <Trash2 className="h-5 w-5" />
          </div>

          <div className="space-y-1.5 min-w-0">
            <h3 className="text-base font-semibold text-foreground">
              Delete deliverable?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This action cannot be undone. <span className="text-foreground font-medium">&ldquo;{deliverableTitle}&rdquo;</span> will be permanently removed from this project.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-border/40">
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
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete Deliverable"}
          </Button>
        </div>
      </div>
    </div>
  );
}
