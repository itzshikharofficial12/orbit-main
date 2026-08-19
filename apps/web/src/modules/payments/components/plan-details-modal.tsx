"use client";

import * as React from "react";
import { X, CreditCard, Calendar, Clock, ArrowDownRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillingTypeBadge } from "./billing-type-badge";
import { BillingStatusBadge } from "./billing-status-badge";
import { formatCurrency, formatPaymentDate } from "../utils";
import type { BillingPlanWithRelations } from "../types";

interface PlanDetailsModalProps {
  plan: BillingPlanWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordPayment?: (plan: BillingPlanWithRelations) => void;
}

export function PlanDetailsModal({
  plan,
  open,
  onOpenChange,
  onRecordPayment,
}: PlanDetailsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/40">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <BillingTypeBadge type={plan.billing_type} />
              <BillingStatusBadge status={plan.status} />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground truncate">
              {plan.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              Client: <span className="text-foreground font-medium">{plan.client?.name}</span>
              {plan.project ? ` • Project: ${plan.project.name}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Financial Summary Card */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-lg border border-border/60 bg-secondary/30 text-center font-mono">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              Contract Value
            </span>
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(plan.total_contract_value, plan.currency)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              Collected
            </span>
            <span className="text-sm font-bold text-emerald-400">
              {formatCurrency(plan.total_collected || 0, plan.currency)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              Outstanding
            </span>
            <span className="text-sm font-bold text-amber-400">
              {formatCurrency(plan.total_outstanding || 0, plan.currency)}
            </span>
          </div>
        </div>

        {/* Schedule Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              Receivable Schedule Items ({(plan.schedule_items || []).length})
            </h3>
            {onRecordPayment && plan.status === "ACTIVE" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onRecordPayment(plan);
                }}
                className="text-xs h-7 gap-1"
              >
                <ArrowDownRight className="h-3 w-3 text-emerald-400" />
                <span>Record Payment</span>
              </Button>
            )}
          </div>

          <div className="rounded-lg border border-border/70 overflow-hidden divide-y divide-border/40">
            {(plan.schedule_items || []).map((item, idx) => (
              <div
                key={item.id}
                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-card hover:bg-secondary/15 transition-colors text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">{item.title}</span>
                    <BillingStatusBadge status={item.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 text-muted-foreground font-mono text-[11px]">
                    <span>Due: {formatPaymentDate(item.due_date)}</span>
                    {item.recurrence_reference && (
                      <span className="text-muted-foreground/80 font-sans">
                        • {item.recurrence_reference}
                      </span>
                    )}
                    {item.milestone && (
                      <span className="text-muted-foreground/80 font-sans">
                        • Milestone: {item.milestone.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 font-mono text-right">
                  <div>
                    <span className="font-semibold text-foreground block">
                      {formatCurrency(item.amount, item.currency)}
                    </span>
                    {(item.paid_amount || 0) > 0 && item.status !== "PAID" && (
                      <span className="text-[10px] text-emerald-400 block">
                        Paid: {formatCurrency(item.paid_amount || 0, item.currency)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 font-sans">
                    <a
                      href={`/hq/payments/${item.id}`}
                      className="inline-flex items-center justify-center rounded px-2 py-1 text-[11px] font-medium bg-secondary/80 text-foreground hover:bg-secondary transition-colors"
                    >
                      View
                    </a>
                    <a
                      href={`/api/payments/invoices/${item.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded px-2 py-1 text-[11px] font-medium border border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                      title="Download Invoice PDF"
                    >
                      PDF
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 cursor-pointer"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
