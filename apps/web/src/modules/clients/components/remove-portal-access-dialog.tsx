"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserMinus, AlertTriangle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { unlinkClientUserAction } from "../actions";

interface RemovePortalAccessDialogProps {
  clientId: string;
  clientName: string;
  profileId: string;
  userEmail: string;
  userName: string;
  trigger?: React.ReactNode;
}

export function RemovePortalAccessDialog({
  clientId,
  clientName,
  profileId,
  userEmail,
  userName,
  trigger,
}: RemovePortalAccessDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  function handleOpen() {
    setErrorMessage(null);
    setIsOpen(true);
  }

  function handleClose() {
    if (isLoading) return;
    setIsOpen(false);
  }

  async function handleConfirm() {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await unlinkClientUserAction(profileId, clientId);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to remove portal access.");
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
        <div onClick={handleOpen} className="inline-block cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpen}
          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <UserMinus className="h-3.5 w-3.5" />
          <span>Remove Access</span>
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-5"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center shrink-0">
                  <UserMinus className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground">
                    Remove portal access?
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Revoke client login access to Orbit.
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
              <Alert variant="destructive" className="py-2.5">
                <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Target Account Summary */}
            <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/15 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-mono text-[10px] uppercase">Client Account</span>
                <span className="font-semibold text-foreground">{clientName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-mono text-[10px] uppercase">Invited User</span>
                <span className="font-medium text-foreground">{userName || "Client User"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-mono text-[10px] uppercase">Login Email</span>
                <span className="font-mono text-muted-foreground">{userEmail}</span>
              </div>
            </div>

            {/* Explanatory Warning */}
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs leading-relaxed">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                This will revoke this client&apos;s Orbit login access. Their client, project, and payment records will remain safely preserved in Orbit.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isLoading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirm}
                disabled={isLoading}
                className="text-xs gap-1.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="h-3.5 w-3.5" />
                    <span>Remove Access</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
