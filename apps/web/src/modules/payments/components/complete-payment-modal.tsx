"use client";

import * as React from "react";
import Link from "next/link";
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
  CheckCircle2,
  Download,
  FileText,
  Copy,
  Check,
  Receipt,
  Clock,
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
  isUnderVerification?: boolean;
  initialTab?: "ONLINE" | "BANK_TRANSFER";
}

interface CompletePaymentModalProps {
  item: CompletePaymentTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface VerifiedPaymentSuccess {
  paymentId: string;
  orderId: string;
  paymentRecordId?: string;
  amount: number;
  currency: string;
  paidAt: string;
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
  const [paymentSuccess, setPaymentSuccess] = React.useState<VerifiedPaymentSuccess | null>(null);
  const [copiedTxn, setCopiedTxn] = React.useState(false);

  const [isPendingVerificationLocked, setIsPendingVerificationLocked] = React.useState(false);

  const router = useRouter();

  React.useEffect(() => {
    if (isOpen && item) {
      setActiveTab(item.initialTab || "ONLINE");
      setTransferAmount(item.amount.toString());
      setTransactionReference("");
      setPaidAt(new Date().toISOString().split("T")[0]);
      setNotes("");
      setErrorMsg(null);
      setPaymentSuccess(null);
      setCopiedTxn(false);
      setIsPendingVerificationLocked(Boolean(item.isUnderVerification));
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleCopyTransactionId = (txnId: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txnId);
      setCopiedTxn(true);
      setTimeout(() => setCopiedTxn(false), 2000);
    }
  };

  const handleBankTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (item.isUnderVerification || isPendingVerificationLocked) {
      setIsPendingVerificationLocked(true);
      return;
    }

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
        setIsSubmitting(false);
        const code = res.code;
        const err = String(res.error || "");

        if (
          code === "PAYMENT_VERIFICATION_PENDING" ||
          err.includes("verification") ||
          err.includes("uq_payments_active_pending_verification") ||
          err.includes("duplicate") ||
          err.includes("already exists") ||
          err.includes("23505")
        ) {
          setIsPendingVerificationLocked(true);
          router.refresh();
          return;
        }

        setErrorMsg(res.error || "Failed to submit bank transfer.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || "");
      if (
        msg.includes("verification") ||
        msg.includes("uq_payments_active_pending_verification") ||
        msg.includes("duplicate") ||
        msg.includes("already exists") ||
        msg.includes("23505")
      ) {
        setIsPendingVerificationLocked(true);
        router.refresh();
      } else {
        setErrorMsg(msg || "Submission error");
      }
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    if (paymentSuccess || isPendingVerificationLocked) {
      router.refresh();
      if (onSuccess) onSuccess();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={handleModalClose}
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-4 sm:p-7 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-4 sm:space-y-5"
      >
        {/* VIEW 0: UNDER VERIFICATION LOCKED SCREEN */}
        {item.isUnderVerification || isPendingVerificationLocked ? (
          <div className="space-y-4 sm:space-y-5 py-4 text-center">
            <div className="h-12 w-12 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-sm">
              <Clock className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Verification Pending</span>
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground pt-1">
                Verification Pending
              </h3>
              <div className="space-y-1 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                <p className="font-medium text-foreground/90">Your bank transfer has already been submitted.</p>
                <p>Our team is currently verifying your payment.</p>
                <p className="text-[11px] text-muted-foreground/80 pt-1">
                  You cannot submit another payment until verification is complete.
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  router.refresh();
                  onClose();
                }}
                className="w-full text-xs h-10 sm:h-9 cursor-pointer min-h-[44px] sm:min-h-0"
              >
                Close
              </Button>
            </div>
          </div>
        ) : paymentSuccess ? (
          /* VIEW 1: PAYMENT SUCCESS CONFIRMATION SCREEN */
          <div className="space-y-6 py-2">
            <div className="text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/30 animate-in zoom-in-90 duration-200">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  Payment Verified
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-foreground pt-1">
                  Payment Successful
                </h2>
                <p className="text-xs text-muted-foreground">
                  Your transaction has been captured and reconciled with instant receipt generation.
                </p>
              </div>
            </div>

            {/* Receipt Summary Card */}
            <div className="rounded-xl border border-border/80 bg-secondary/30 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {formatCurrency(paymentSuccess.amount, paymentSuccess.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>Invoice / Milestone</span>
                <span className="font-semibold text-foreground text-right">{item.title}</span>
              </div>

              {item.projectName && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Project</span>
                  <span className="font-medium text-foreground">{item.projectName}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-muted-foreground">
                <span>Payment Method</span>
                <span className="font-medium text-foreground">Razorpay (Online)</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>Paid On</span>
                <span className="font-mono text-foreground">{formatPaymentDate(paymentSuccess.paidAt)}</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/50">
                <span>Transaction ID</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-foreground">
                  <span>{paymentSuccess.paymentId}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyTransactionId(paymentSuccess.paymentId)}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Copy Transaction ID"
                  >
                    {copiedTxn ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {paymentSuccess.paymentRecordId ? (
                  <a
                    href={`/api/payments/receipts/${paymentSuccess.paymentRecordId}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button
                      variant="outline"
                      className="w-full h-9 text-xs font-semibold gap-1.5 border-border/80 hover:bg-secondary cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Receipt PDF</span>
                    </Button>
                  </a>
                ) : (
                  <Link href="/client/payments" className="w-full">
                    <Button
                      variant="outline"
                      className="w-full h-9 text-xs font-semibold gap-1.5 border-border/80 hover:bg-secondary cursor-pointer"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>View in Receipts</span>
                    </Button>
                  </Link>
                )}

                <Link href={`/client/payments/${item.id}`} className="w-full">
                  <Button
                    variant="outline"
                    className="w-full h-9 text-xs font-semibold gap-1.5 border-border/80 hover:bg-secondary cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>View Invoice PDF</span>
                  </Button>
                </Link>
              </div>

              <Button
                type="button"
                onClick={handleModalClose}
                className="w-full h-10 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow cursor-pointer"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* VIEW 2: PAYMENT METHOD SELECTION & CHECKOUT FORM */
          <>
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
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Amount & Due Date Banner */}
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 flex items-center justify-between">
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
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary/40 border border-border/40">
              <button
                type="button"
                onClick={() => setActiveTab("ONLINE")}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Option A: Razorpay Online Payment */}
            {activeTab === "ONLINE" && (
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-xl border border-border/60 bg-background/50 space-y-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Instant Secure Checkout</span>
                  </div>
                  <p className="leading-relaxed">
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
                    className="w-full h-11 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow cursor-pointer"
                    onSuccess={(details) => {
                      setPaymentSuccess({
                        paymentId: details.paymentId,
                        orderId: details.orderId,
                        paymentRecordId: details.paymentRecordId,
                        amount: item.amount,
                        currency: item.currency,
                        paidAt: new Date().toISOString(),
                      });
                      router.refresh();
                    }}
                    onError={(err) => {
                      setErrorMsg(err);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Option B: Direct Bank Transfer */}
            {activeTab === "BANK_TRANSFER" && (
              <form onSubmit={handleBankTransferSubmit} className="space-y-3.5 text-xs">
                {/* Beneficiary Details */}
                <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-1 font-mono text-[11px]">
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
                      className="font-mono text-sm sm:text-xs h-10 sm:h-8"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Transfer Amount</label>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="Amount"
                        className="font-mono text-sm sm:text-xs h-10 sm:h-8"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Transfer Date</label>
                      <Input
                        type="date"
                        value={paidAt}
                        onChange={(e) => setPaidAt(e.target.value)}
                        className="font-mono text-sm sm:text-xs h-10 sm:h-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Optional Notes</label>
                    <Textarea
                      placeholder="e.g., Transferred from Axis Bank account ending in 4092"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-16 sm:h-14 text-sm sm:text-xs bg-background resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-xs h-10 sm:h-8 cursor-pointer min-h-[44px] sm:min-h-0"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting || !transactionReference.trim()}
                    className="text-xs h-10 sm:h-8 gap-1.5 cursor-pointer font-semibold min-h-[44px] sm:min-h-0"
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
          </>
        )}
      </div>
    </div>
  );
}
