"use client";

import * as React from "react";
import { CreditCard, Calendar, Clock, ArrowDownRight, CheckCircle2, AlertCircle, Receipt } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BillingStatusBadge } from "./billing-status-badge";
import { BillingTypeBadge } from "./billing-type-badge";
import { formatCurrency, formatPaymentDate } from "../utils";
import type {
  BillingPlanWithRelations,
  PaymentWithRelations,
  PaymentOverviewMetrics,
} from "../types";

interface ClientPaymentsViewProps {
  plans: BillingPlanWithRelations[];
  payments: PaymentWithRelations[];
  metrics: PaymentOverviewMetrics;
}

export function ClientPaymentsView({
  plans,
  payments,
  metrics,
}: ClientPaymentsViewProps) {
  // Collect all upcoming schedule items across all client plans
  const upcomingScheduleItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      planName: string;
      title: string;
      amount: number;
      currency: string;
      dueDate: string | null;
      status: any;
      paidAmount: number;
      remainingAmount: number;
    }> = [];

    plans.forEach((plan) => {
      (plan.schedule_items || []).forEach((it) => {
        if (it.status !== "PAID" && it.status !== "CANCELLED") {
          items.push({
            id: it.id,
            planName: plan.name,
            title: it.title,
            amount: it.amount,
            currency: it.currency,
            dueDate: it.due_date,
            status: it.status,
            paidAmount: it.paid_amount || 0,
            remainingAmount: it.remaining_amount || it.amount,
          });
        }
      });
    });

    return items.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [plans]);

  return (
    <div className="space-y-8">
      {/* 1. Client Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
              Outstanding Balance
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-amber-400 font-mono">
              {formatCurrency(metrics.outstanding, metrics.currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Current pending balance</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
              Total Paid
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-emerald-400 font-mono">
              {formatCurrency(metrics.collected, metrics.currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Settled invoices to date</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
              Next Due Amount
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-blue-400 font-mono">
              {upcomingScheduleItems[0]
                ? formatCurrency(upcomingScheduleItems[0].remainingAmount, upcomingScheduleItems[0].currency)
                : "₹0"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground font-mono">
              {upcomingScheduleItems[0]?.dueDate
                ? `Due: ${formatPaymentDate(upcomingScheduleItems[0].dueDate)}`
                : "No upcoming payments due"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Billing Schedule Section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Billing Schedule & Receivables</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Upcoming installments, retainers, and milestone payments.
          </p>
        </div>

        {upcomingScheduleItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-8 text-center text-xs text-muted-foreground">
            All current billing schedule items have been settled in full.
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 bg-card overflow-hidden divide-y divide-border/40 shadow-sm">
            {upcomingScheduleItems.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/15 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm truncate">
                      {item.title}
                    </span>
                    <BillingStatusBadge status={item.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Plan: {item.planName}</span>
                    <span>•</span>
                    <span className="font-mono flex items-center gap-1 text-foreground/80">
                      <Clock className="h-3 w-3" />
                      <span>Due: {formatPaymentDate(item.dueDate)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono">
                    <span className="text-base font-bold text-foreground block">
                      {formatCurrency(item.remainingAmount, item.currency)}
                    </span>
                    {item.paidAmount > 0 && (
                      <span className="text-[11px] text-emerald-400 block">
                        Paid: {formatCurrency(item.paidAmount, item.currency)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 font-sans">
                    <a
                      href={`/client/payments/${item.id}`}
                      className="inline-flex items-center justify-center rounded px-2.5 py-1 text-xs font-medium bg-secondary/80 text-foreground hover:bg-secondary transition-colors"
                    >
                      View Invoice
                    </a>
                    <a
                      href={`/api/payments/invoices/${item.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded border border-border/80 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      PDF
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Payment Receipts & Transaction History */}
      <div className="space-y-4 pt-4 border-t border-border/60">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground/90 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-400" />
            <span>Verified Payment Receipts</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            History of received and verified payments with transaction references.
          </p>
        </div>

        {payments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-8 text-center text-xs text-muted-foreground">
            No payment transaction receipts recorded yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-secondary/30 text-muted-foreground uppercase font-mono tracking-wider text-[11px]">
                    <th className="py-3 px-4 font-semibold">Payment Date</th>
                    <th className="py-3 px-4 font-semibold">Description</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold">Method</th>
                    <th className="py-3 px-4 font-semibold">UTR / Reference</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-secondary/15 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-foreground">
                        {formatPaymentDate(pay.paid_at)}
                      </td>
                      <td className="py-3 px-4 font-sans text-foreground">
                        {pay.schedule_item?.id ? (
                          <a
                            href={`/client/payments/${pay.schedule_item.id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {pay.schedule_item.title}
                          </a>
                        ) : (
                          pay.schedule_item?.title || "Account Payment"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-emerald-400">
                        {formatCurrency(pay.amount, pay.currency)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-sans text-muted-foreground">
                        {pay.method === "BANK_TRANSFER" ? "Bank Transfer" : "Razorpay"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-foreground">
                        {pay.transaction_reference || "—"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <BillingStatusBadge status={pay.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-sans">
                        {pay.status === "PAID" ? (
                          <a
                            href={`/api/payments/receipts/${pay.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-border/80 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                          >
                            <span>Receipt PDF</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
