"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserCheck, X, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { assignClientProjectManagerAction } from "../actions";
import type { TeamMember } from "../types";

interface AssignPmDialogProps {
  clientId: string;
  clientName: string;
  currentPm: TeamMember | null;
  projectManagers: TeamMember[];
  trigger?: React.ReactNode;
}

export function AssignPmDialog({
  clientId,
  clientName,
  currentPm,
  projectManagers,
  trigger,
}: AssignPmDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [selectedPmId, setSelectedPmId] = React.useState<string>(
    currentPm?.id || ""
  );
  const [note, setNote] = React.useState("");
  const [isConfirming, setIsConfirming] = React.useState(false);

  React.useEffect(() => {
    setSelectedPmId(currentPm?.id || "");
    setIsConfirming(false);
  }, [currentPm, isOpen]);

  function handleOpen() {
    setSelectedPmId(currentPm?.id || "");
    setNote("");
    setErrorMessage(null);
    setIsConfirming(false);
    setIsOpen(true);
  }

  function handleClose() {
    if (isLoading) return;
    setIsOpen(false);
    setIsConfirming(false);
  }

  const selectedPm = React.useMemo(() => {
    return projectManagers.find((pm) => pm.id === selectedPmId) || null;
  }, [projectManagers, selectedPmId]);

  const isChanging = currentPm && selectedPmId && currentPm.id !== selectedPmId;
  const isRemoving = currentPm && selectedPmId === "";

  async function handleProceed(e: React.FormEvent) {
    e.preventDefault();
    if (!isConfirming && (isChanging || isRemoving)) {
      setIsConfirming(true);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await assignClientProjectManagerAction(
      clientId,
      selectedPmId ? selectedPmId : null,
      note ? note : null
    );

    if (!result.success) {
      setErrorMessage(result.error || "Failed to update Project Manager.");
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
        <div onClick={handleOpen}>{trigger}</div>
      ) : (
        <Button
          onClick={handleOpen}
          size="sm"
          variant="outline"
          className="h-8 text-xs px-3 gap-1.5 border-border/80 hover:bg-secondary"
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>{currentPm ? "Change PM" : "Assign PM"}</span>
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl z-10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {currentPm ? "Change Project Manager" : "Assign Project Manager"}
                  </h3>
                  <p className="text-xs text-muted-foreground">{clientName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Confirmation Screen */}
            {isConfirming ? (
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <AlertCircle className="h-4 w-4" />
                    <span>Confirm PM Reassignment</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {isRemoving ? (
                      <>
                        Are you sure you want to remove{" "}
                        <strong className="text-foreground">
                          {currentPm?.first_name} {currentPm?.last_name || ""}
                        </strong>{" "}
                        as the Project Manager for <strong>{clientName}</strong>?
                      </>
                    ) : (
                      <>
                        This will make{" "}
                        <strong className="text-foreground">
                          {selectedPm?.first_name} {selectedPm?.last_name || ""}
                        </strong>{" "}
                        the primary Project Manager for <strong>{clientName}</strong>,
                        replacing{" "}
                        <span className="text-muted-foreground">
                          {currentPm?.first_name} {currentPm?.last_name || ""}
                        </span>
                        .
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsConfirming(false)}
                    disabled={isLoading}
                    className="h-8 text-xs px-3"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleProceed}
                    disabled={isLoading}
                    className="h-8 text-xs px-4 font-semibold shadow-sm"
                  >
                    {isLoading ? "Reassigning..." : "Confirm Reassignment"}
                  </Button>
                </div>
              </div>
            ) : (
              /* Selection Form */
              <form onSubmit={handleProceed} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pm_select" className="text-xs font-medium">
                    Primary Project Manager *
                  </Label>
                  <select
                    id="pm_select"
                    value={selectedPmId}
                    onChange={(e) => setSelectedPmId(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">-- No Project Manager assigned --</option>
                    {projectManagers.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.first_name} {pm.last_name || ""} ({pm.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Only active employees with the Project Manager role are listed.
                  </p>
                </div>

                {/* Selected PM Preview */}
                {selectedPm && (
                  <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20 shrink-0">
                        {selectedPm.first_name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">
                          {selectedPm.first_name} {selectedPm.last_name || ""}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate font-mono">
                          {selectedPm.email}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                      Active PM
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="h-8 text-xs px-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading || (currentPm?.id === selectedPmId && selectedPmId !== "")}
                    className="h-8 text-xs px-4 font-semibold shadow-sm"
                  >
                    {isLoading
                      ? "Saving..."
                      : isChanging || isRemoving
                      ? "Continue →"
                      : "Assign PM"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
