"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Building2,
  Calendar,
  AlertTriangle,
  Send,
  Loader2,
  X,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RazorpayCheckoutButton } from "./razorpay-checkout-button";
import { formatCurrency, formatPaymentDate } from "../utils";
import { CELESTIA_COMPANY_INFO } from "../config";
import { submitBankTransferAction } from "../actions";

export interface CompletePaymentTarget {
  id: string;
  title: string;
  amount: number;
  currency: string;
  dueDate?: string | null;
  projectName?: string;
}

interface CompletePaymentModalProps {
  item: CompletePaymentTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CompletePaymentModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: CompletePaymentModalProps) {
  const [activeTab, setActiveTab] = React.useState<"ONLINE" | "BANK_TRANSFER">("ONLINE");
  const [transferAmount, setTransferAmount] = React.useState("");
  const [transactionReference, setTransactionReference] = React.useState("");
  const [paidAt, setPaidAt] = React.useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const router = useRouter();

  React.useEffect(() => {
    if (isOpen && item) {
      setActiveTab("ONLINE");
      setTransferAmount(item.amount.toString());
      setTransactionReference("");
      setPaidAt(new Date().toISOString().split("T")[0]);
      setNotes("");
      setErrorMsg(null);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleBankTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionReference.trim()) {
      setErrorMsg("Please enter the Bank Reference Number / UTR.");
      return;
    }

    const numAmount = parseFloat(transferAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter a valid transfer amount.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append("schedule_item_id", item.id);
      formData.append("amount", transferAmount);
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold block mb-0.5">
              Complete Payment
            </span>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {item.title}
            </h2>
            {item.projectName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Project: <span className="text-foreground font-medium">{item.projectName}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Amount & Due Date Banner */}
        <div className="p-3.5 rounded-lg bg-secondary/30 border border-border/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">
              Amount Due
            </span>
            <span className="text-xl font-bold font-mono text-foreground">
              {formatCurrency(item.amount, item.currency)}
            </span>
          </div>

          {item.dueDate && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">
                Due Date
              </span>
              <span className="text-xs font-mono text-foreground/90">
                {formatPaymentDate(item.dueDate)}
              </span>
            </div>
          )}
        </div>

        {/* Method Toggle Buttons */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-secondary/40 border border-border/40">
          <button
            type="button"
            onClick={() => setActiveTab("ONLINE")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              activeTab === "ONLINE"
                ? "bg-card text-foreground shadow-sm border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span>Online Payment</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BANK_TRANSFER")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              activeTab === "BANK_TRANSFER"
                ? "bg-card text-foreground shadow-sm border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Direct Bank Wire</span>
          </button>
        </div>

        {/* Error Callout */}
        {errorMsg && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Option A: Razorpay Online Payment */}
        {activeTab === "ONLINE" && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-lg border border-border/60 bg-background/50 space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Instant Secure Checkout</span>
              </div>
              <p>
                Pay immediately using UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, or NetBanking.
                Your payment will be reconciled automatically with instant receipt generation.
              </p>
            </div>

            <div className="pt-2">
              <RazorpayCheckoutButton
                scheduleItemId={item.id}
                amount={item.amount}
                currency={item.currency}
                title={`Pay ${formatCurrency(item.amount, item.currency)} Online`}
                size="default"
                className="w-full h-10 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow"
                onSuccess={() => {
                  onClose();
                  if (onSuccess) onSuccess();
                }}
              />
            </div>
          </div>
        )}

        {/* Option B: Direct Bank Transfer */}
        {activeTab === "BANK_TRANSFER" && (
          <form onSubmit={handleBankTransferSubmit} className="space-y-3.5 text-xs">
            {/* Beneficiary Details */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/60 space-y-1 font-mono text-[11px]">
              <div className="text-[10px] font-sans font-medium uppercase tracking-wider text-muted-foreground mb-1">
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
                <span>Bank:</span>
                <span className="text-foreground">{CELESTIA_COMPANY_INFO.bankDetails.bankName}</span>
              </div>
            </div>

            <div className="space-y-3">
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
                  className="font-mono text-xs h-8"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Transfer Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Amount"
                    className="font-mono text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Transfer Date</label>
                  <Input
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    className="font-mono text-xs h-8"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Optional Notes</label>
                <Textarea
                  placeholder="e.g., Transferred from Axis Bank account ending in 4092"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-14 text-xs bg-background resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !transactionReference.trim()}
                className="text-xs h-8 gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>{isSubmitting ? "Submitting..." : "Submit Bank Proof"}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
