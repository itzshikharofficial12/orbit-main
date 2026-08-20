"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  FolderGit2,
  FileText,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatPaymentDate } from "../utils";
import { verifyBankTransferAction, rejectBankTransferAction } from "../actions";
import type { PendingBankTransfer } from "../types";

interface ReviewBankTransferModalProps {
  transfer: PendingBankTransfer | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReviewBankTransferModal({
  transfer,
  isOpen,
  onClose,
  onSuccess,
}: ReviewBankTransferModalProps) {
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [showRejectForm, setShowRejectForm] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [adminNotes, setAdminNotes] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const router = useRouter();

  React.useEffect(() => {
    if (isOpen) {
      setShowRejectForm(false);
      setRejectionReason("");
      setAdminNotes("");
      setErrorMsg(null);
    }
  }, [isOpen, transfer]);

  if (!isOpen || !transfer) return null;

  const handleVerify = async () => {
    try {
      setIsVerifying(true);
      setErrorMsg(null);

      const res = await verifyBankTransferAction({
        paymentId: transfer.id,
        notes: adminNotes.trim() || undefined,
      });

      if (res.success) {
        setIsVerifying(false);
        onClose();
        router.refresh();
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.error || "Failed to verify bank transfer.");
        setIsVerifying(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification error";
      setErrorMsg(msg);
      setIsVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setErrorMsg("Please specify a reason for rejecting this transfer.");
      return;
    }

    try {
      setIsRejecting(true);
      setErrorMsg(null);

      const res = await rejectBankTransferAction({
        paymentId: transfer.id,
        reason: rejectionReason.trim(),
      });

      if (res.success) {
        setIsRejecting(false);
        onClose();
        router.refresh();
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.error || "Failed to reject transfer.");
        setIsRejecting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Rejection error";
      setErrorMsg(msg);
      setIsRejecting(false);
    }
  };

  const expectedAmount = Number(transfer.schedule_item?.amount) || 0;
  const submittedAmount = Number(transfer.amount) || 0;
  const isAmountMismatch = expectedAmount > 0 && Math.abs(expectedAmount - submittedAmount) > 0.01;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Review Bank Wire Transfer
              </h2>
              <p className="text-xs text-muted-foreground">
                Verify the client&apos;s submitted UTR against your authoritative bank statement.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {errorMsg && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Transfer Summary Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-secondary/30 border border-border/60">
            <div className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                Client
              </span>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{transfer.client.name}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                Project
              </span>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{transfer.project?.name || "General Account"}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                Invoice / Item
              </span>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {transfer.schedule_item?.title || "Payment Schedule"}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                Transfer Date
              </span>
              <div className="font-mono text-xs text-foreground/90">
                {formatPaymentDate(transfer.paid_at || transfer.created_at)}
              </div>
            </div>
          </div>

          {/* Amount & UTR Details */}
          <div className="p-3.5 rounded-lg border border-border/80 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">Submitted Amount</span>
                <span className="text-xl font-bold font-mono text-foreground">
                  {formatCurrency(submittedAmount, transfer.currency)}
                </span>
              </div>

              {expectedAmount > 0 && (
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Invoice Total</span>
                  <span className="text-sm font-mono text-muted-foreground">
                    {formatCurrency(expectedAmount, transfer.currency)}
                  </span>
                </div>
              )}
            </div>

            {isAmountMismatch && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Submitted amount differs from invoice expected total ({formatCurrency(expectedAmount, transfer.currency)}).
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">UTR / Transaction Reference:</span>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-secondary text-foreground">
                {transfer.transaction_reference || "NO REFERENCE PROVIDED"}
              </span>
            </div>

            {transfer.notes && (
              <div className="pt-2 border-t border-border/40">
                <span className="text-xs text-muted-foreground block mb-1">Client Notes:</span>
                <p className="text-xs text-foreground/80 italic bg-secondary/40 p-2 rounded">
                  &ldquo;{transfer.notes}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Action Sections */}
          {!showRejectForm ? (
            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-muted-foreground">
                Optional Admin Verification Note:
              </label>
              <Textarea
                placeholder="e.g., Verified in HDFC Current A/c on 19 Aug."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="h-16 text-xs bg-background resize-none"
              />
            </div>
          ) : (
            <div className="space-y-2 pt-1 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Rejection Reason (Sent to Client):</span>
              </div>
              <Textarea
                placeholder="e.g., UTR reference not found in bank statement, or transfer amount does not match."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="h-20 text-xs bg-background resize-none border-destructive/30 focus-visible:ring-destructive"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border/60">
          {!showRejectForm ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRejectForm(true)}
                className="w-full sm:w-auto text-xs text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                <span>Reject Transfer</span>
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                >
                  {isVerifying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  <span>{isVerifying ? "Verifying..." : "Verify & Mark Paid"}</span>
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowRejectForm(false)}
                className="text-xs"
              >
                Back to Review
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                  className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
                >
                  {isRejecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  <span>{isRejecting ? "Rejecting..." : "Confirm Rejection"}</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
