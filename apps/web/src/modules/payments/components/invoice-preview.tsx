"use client";

import * as React from "react";
import Link from "next/link";
import {
  Download,
  ArrowLeft,
  Receipt,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillingStatusBadge } from "./billing-status-badge";
import { CompletePaymentModal } from "./complete-payment-modal";
import { PaymentQueryModal } from "./payment-query-modal";
import { formatCurrency, formatPaymentDate } from "../utils";
import { CELESTIA_COMPANY_INFO } from "../config";
import type { InvoiceWithDetails } from "../types";

interface InvoicePreviewProps {
  invoice: InvoiceWithDetails;
  isSuperAdmin: boolean;
  onRecordPayment?: () => void;
}

export function InvoicePreview({
  invoice,
  isSuperAdmin,
  onRecordPayment,
}: InvoicePreviewProps) {
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [showQueryModal, setShowQueryModal] = React.useState(false);
  const backHref = isSuperAdmin ? "/hq/payments" : "/client/payments";
  const pdfDownloadUrl = `/api/payments/invoices/${invoice.id}/pdf`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/40">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Payments</span>
        </Link>

        <div className="flex items-center gap-2">
          {!isSuperAdmin && invoice.balance_due > 0 && (
            <>
              <Button
                size="sm"
                onClick={() => setShowPaymentModal(true)}
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Pay Now</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQueryModal(true)}
                className="h-8 gap-1.5 text-xs border-border/80 hover:bg-secondary"
              >
                <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
                <span>Raise a Query</span>
              </Button>
            </>
          )}

          {isSuperAdmin && invoice.balance_due > 0 && onRecordPayment && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRecordPayment}
              className="h-8 gap-1.5 text-xs hover:text-emerald-400 hover:border-emerald-800/60"
            >
              <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" />
              <span>Record Payment</span>
            </Button>
          )}

          <a href={pdfDownloadUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="h-8 gap-1.5 text-xs cursor-pointer">
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </Button>
          </a>
        </div>
      </div>

      {/* Web Invoice Printable Paper Layout */}
      <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-10 shadow-lg space-y-8">
        {/* 1. Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-border/50">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">ORBIT</h1>
            <p className="text-xs font-medium text-muted-foreground">by Celestia Studios</p>
            <div className="text-[11px] text-muted-foreground pt-2 space-y-0.5 font-mono">
              <p>{CELESTIA_COMPANY_INFO.tagline}</p>
              <p>{CELESTIA_COMPANY_INFO.address}</p>
              <p>Email: {CELESTIA_COMPANY_INFO.email}</p>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1.5 font-mono">
            <span className="text-xs uppercase tracking-widest text-muted-foreground block">
              INVOICE
            </span>
            <span className="text-lg font-bold text-foreground block">
              {invoice.invoice_number}
            </span>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Issue Date: {formatPaymentDate(invoice.issue_date)}</p>
              <p>Due Date: {formatPaymentDate(invoice.due_date)}</p>
            </div>
            <div className="pt-1">
              <BillingStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* 2. Bill To & Project Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-lg bg-secondary/20 border border-border/40 text-xs">
          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
              BILL TO
            </span>
            <p className="font-semibold text-foreground text-sm">{invoice.client.name}</p>
            {invoice.client.primary_contact_name && (
              <p className="text-muted-foreground">Attn: {invoice.client.primary_contact_name}</p>
            )}
            {invoice.client.primary_contact_email && (
              <p className="text-muted-foreground font-mono">{invoice.client.primary_contact_email}</p>
            )}
            {invoice.client.primary_contact_phone && (
              <p className="text-muted-foreground font-mono">{invoice.client.primary_contact_phone}</p>
            )}
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
              ENGAGEMENT & PROJECT
            </span>
            <p className="font-semibold text-foreground text-sm">
              {invoice.project ? invoice.project.name : "General Account"}
            </p>
            {invoice.project && (
              <p className="text-muted-foreground">
                Service: {invoice.project.service_type.replace("_", " ")}
              </p>
            )}
            <p className="text-muted-foreground">Plan: {invoice.billing_plan.name}</p>
          </div>
        </div>

        {/* 3. Line Items Table */}
        <div className="rounded-lg border border-border/70 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/40 text-muted-foreground uppercase font-mono tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold text-center w-16">Qty</th>
                <th className="py-3 px-4 font-semibold text-right w-28">Unit Price</th>
                <th className="py-3 px-4 font-semibold text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              <tr>
                <td className="py-3.5 px-4 font-sans">
                  <span className="font-semibold text-foreground block">{invoice.title}</span>
                  {invoice.description && (
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      {invoice.description}
                    </span>
                  )}
                  {invoice.milestone && (
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Milestone Link: {invoice.milestone.name}
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">1</td>
                <td className="py-3.5 px-4 text-right text-foreground">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-foreground">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Summary & Payment Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Left: Bank Transfer Coordinates */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-2 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <span>BANK TRANSFER / PAYMENT DETAILS</span>
            </span>
            <div className="space-y-1 font-mono text-[11px] text-muted-foreground pt-1">
              <p>Bank Name: <span className="text-foreground">{CELESTIA_COMPANY_INFO.bankDetails.bankName}</span></p>
              <p>Account Name: <span className="text-foreground">{CELESTIA_COMPANY_INFO.bankDetails.accountName}</span></p>
              <p>Account No: <span className="text-foreground font-bold">{CELESTIA_COMPANY_INFO.bankDetails.accountNumber}</span></p>
              <p>IFSC Code: <span className="text-foreground font-bold">{CELESTIA_COMPANY_INFO.bankDetails.ifscCode}</span></p>
              <p>UPI ID: <span className="text-foreground">{CELESTIA_COMPANY_INFO.bankDetails.upiId}</span></p>
            </div>
            <p className="text-[10px] text-muted-foreground/80 italic pt-1">
              * Please reference {invoice.invoice_number} in your wire memo.
            </p>
          </div>

          {/* Right: Financial Breakdown */}
          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.amount, invoice.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Tax / GST (0%):</span>
              <span>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-b border-border/50 text-sm font-bold text-foreground">
              <span>Total Invoice Amount:</span>
              <span>{formatCurrency(invoice.amount + invoice.tax_amount, invoice.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-400 font-medium">
              <span>Amount Paid:</span>
              <span>{formatCurrency(invoice.paid_amount, invoice.currency)}</span>
            </div>
            <div
              className={`flex items-center justify-between p-3 rounded-md text-sm font-bold ${
                invoice.balance_due === 0
                  ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/50"
                  : "bg-amber-950/40 text-amber-300 border border-amber-800/50"
              }`}
            >
              <span>Balance Due:</span>
              <span>{formatCurrency(invoice.balance_due, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {/* 5. Notes & Terms */}
        <div className="space-y-2 pt-4 border-t border-border/40 text-xs text-muted-foreground">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
            TERMS & CONDITIONS
          </span>
          <p className="leading-relaxed">{invoice.terms || CELESTIA_COMPANY_INFO.defaultTerms}</p>
          {invoice.notes && (
            <p className="leading-relaxed pt-1 font-mono text-[11px]">
              Notes: {invoice.notes}
            </p>
          )}
        </div>

        {/* 6. Payment Receipts Ledger (If payments have been made) */}
        {invoice.payments.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                <span>Verified Payment Receipts ({invoice.payments.length})</span>
              </span>
            </div>

            <div className="rounded-lg border border-border/60 overflow-hidden divide-y divide-border/40">
              {invoice.payments.map((p) => (
                <div
                  key={p.id}
                  className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-secondary/10 hover:bg-secondary/20 transition-colors text-xs font-mono"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground">
                      Receipt {p.receipt_number || `CS-RCP-2026-${p.id.slice(0, 4)}`}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Date: {formatPaymentDate(p.paid_at)} • Ref (UTR): {p.transaction_reference || "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-400">
                      {formatCurrency(p.amount, p.currency)}
                    </span>
                    {p.status === "PAID" ? (
                      <a
                        href={`/api/payments/receipts/${p.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 font-sans">
                          <Download className="h-3 w-3" />
                          <span>Download Receipt</span>
                        </Button>
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic font-sans">
                        Pending Verification
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showPaymentModal && (
        <CompletePaymentModal
          item={{
            id: invoice.id,
            title: invoice.title,
            amount: invoice.balance_due,
            currency: invoice.currency,
            dueDate: invoice.due_date,
            projectName: invoice.project?.name,
          }}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {showQueryModal && (
        <PaymentQueryModal
          isOpen={showQueryModal}
          onClose={() => setShowQueryModal(false)}
          items={[
            {
              id: invoice.id,
              title: invoice.title,
              amount: invoice.balance_due,
              currency: invoice.currency,
              projectId: invoice.project?.id || undefined,
            },
          ]}
          preselectedItemId={invoice.id}
          defaultProjectId={invoice.project?.id || undefined}
        />
      )}
    </div>
  );
}
