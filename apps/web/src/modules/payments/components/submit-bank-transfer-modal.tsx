"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Loader2,
  AlertTriangle,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "../utils";
import { CELESTIA_COMPANY_INFO } from "../config";
import { submitBankTransferAction } from "../actions";

interface SubmitBankTransferModalProps {
  scheduleItemId: string;
  invoiceTitle?: string;
  invoiceNumber?: string;
  amountDue: number;
  currency?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SubmitBankTransferModal({
  scheduleItemId,
  invoiceTitle,
  invoiceNumber,
  amountDue,
  currency = "INR",
  isOpen,
  onClose,
  onSuccess,
}: SubmitBankTransferModalProps) {
  const [amount, setAmount] = React.useState(amountDue.toString());
  const [transactionReference, setTransactionReference] = React.useState("");
  const [paidAt, setPaidAt] = React.useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const router = useRouter();

  React.useEffect(() => {
    if (isOpen) {
      setAmount(amountDue.toString());
      setTransactionReference("");
      setPaidAt(new Date().toISOString().split("T")[0]);
      setNotes("");
      setErrorMsg(null);
    }
  }, [isOpen, amountDue]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionReference.trim()) {
      setErrorMsg("Please enter the Bank Reference Number / UTR.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter a valid transfer amount.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append("schedule_item_id", scheduleItemId);
      formData.append("amount", amount);
      formData.append("transaction_reference", transactionReference.trim());
      formData.append("paid_at", paidAt);
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }

      const res = await submitBankTransferAction(formData);

      if (res.success) {
        setIsSubmitting(false);
        onClose();
        router.refresh();
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.error || "Failed to submit bank transfer.");
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission error";
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Submit Direct Bank Transfer
              </h2>
              <p className="text-xs text-muted-foreground">
                Enter your bank transfer reference (UTR) for verification.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Account Details Callout */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/60 text-xs space-y-1.5 font-mono">
            <div className="text-[11px] font-sans font-medium uppercase tracking-wider text-muted-foreground">
              Beneficiary Bank Details
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>A/C Name:</span>
              <span className="text-foreground font-semibold">{CELESTIA_COMPANY_INFO.bankDetails.accountName}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Account No:</span>
              <span className="text-foreground font-semibold">{CELESTIA_COMPANY_INFO.bankDetails.accountNumber}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IFSC Code:</span>
              <span className="text-foreground font-semibold">{CELESTIA_COMPANY_INFO.bankDetails.ifscCode}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Bank Name:</span>
              <span className="text-foreground">{CELESTIA_COMPANY_INFO.bankDetails.bankName}</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-foreground">Transfer Amount (INR)</label>
              <Input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount transferred"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">
                Transaction Reference / UTR Number <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                required
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                placeholder="e.g., HDFC00012345678 or UPI Ref"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Date of Transfer</label>
              <Input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Additional Notes (Optional)</label>
              <Textarea
                placeholder="e.g., Transferred from Axis Bank account ending in 4092"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-16 text-xs bg-background resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/60">
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
              type="submit"
              size="sm"
              disabled={isSubmitting || !transactionReference.trim()}
              className="text-xs gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>{isSubmitting ? "Submitting..." : "Submit for Verification"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
