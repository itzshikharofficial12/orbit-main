"use client";

import * as React from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelMeetingAction } from "../actions";
import type { MeetingWithRelations } from "../types";

interface CancelMeetingDialogProps {
  meeting: MeetingWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelMeetingDialog({
  meeting,
  open,
  onOpenChange,
}: CancelMeetingDialogProps) {
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  function handleClose() {
    if (isPending) return;
    onOpenChange(false);
    setErrorMessage(null);
  }

  function handleCancel() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await cancelMeetingAction(meeting.id);
      if (result.success) {
        onOpenChange(false);
      } else {
        setErrorMessage(result.error || "Failed to cancel meeting");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Cancel meeting?
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed pt-3">
          This meeting will be marked as cancelled and the client will be notified.
        </p>

        {errorMessage && (
          <div className="mt-3 p-3 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/30 leading-relaxed font-mono">
            {errorMessage}
          </div>
        )}

        <div className="mt-3.5 p-3.5 rounded-lg border border-border/60 bg-secondary/30 text-xs space-y-1">
          <p className="font-semibold text-foreground truncate">{meeting.title}</p>
          <p className="text-muted-foreground">
            Client: {meeting.client?.name || "Client"}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isPending}
            className="text-xs h-8 cursor-pointer"
          >
            Keep Meeting
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={isPending}
            className="text-xs h-8 gap-1.5 cursor-pointer bg-red-950/60 text-red-300 border border-red-800/60 hover:bg-red-900/80"
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>Cancel Meeting</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
