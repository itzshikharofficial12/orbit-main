"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  CreditCard,
  X,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillingTypeBadge } from "./billing-type-badge";
import { BillingStatusBadge } from "./billing-status-badge";
import { formatCurrency, formatPaymentDate } from "../utils";
import type { BillingPlanWithRelations } from "../types";
import type { CompletePaymentTarget } from "./complete-payment-modal";

interface ClientPlanScheduleModalProps {
  plan: BillingPlanWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onPayItem?: (item: CompletePaymentTarget) => void;
}

export function ClientPlanScheduleModal({
  plan,
  isOpen,
  onClose,
  onPayItem,
}: ClientPlanScheduleModalProps) {
  if (!isOpen || !plan) return null;

  const scheduleItems = plan.schedule_items || [];
  const completedCount = scheduleItems.filter((i) => i.status === "PAID" || i.status === "WAIVED").length;
  const totalCount = scheduleItems.length;

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
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <BillingTypeBadge type={plan.billing_type} />
              <BillingStatusBadge status={plan.status} />
            </div>
            <h2 className="text-base font-semibold tracking-tight text-foreground truncate">
              {plan.name}
            </h2>
            {plan.project && (
              <p className="text-xs text-muted-foreground">
                Project: <span className="text-foreground font-medium">{plan.project.name}</span>
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

        {/* Plan Overview Metrics */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-lg bg-secondary/30 border border-border/60">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
              Total Plan Value
            </span>
            <span className="text-sm font-bold font-mono text-foreground block">
              {formatCurrency(plan.total_contract_value, plan.currency)}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
              Paid to Date
            </span>
            <span className="text-sm font-bold font-mono text-emerald-400 block">
              {formatCurrency(plan.total_collected || 0, plan.currency)}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
              Remaining
            </span>
            <span className="text-sm font-bold font-mono text-foreground block">
              {formatCurrency(plan.total_outstanding || 0, plan.currency)}
            </span>
          </div>
        </div>

        {/* Milestone Progress Indicator if Installments */}
        {totalCount > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-mono">
            <span>
              Progress: <strong className="text-foreground font-semibold">{completedCount}</strong> of{" "}
              {totalCount} milestones settled
            </span>
            <span>{Math.round((completedCount / totalCount) * 100)}%</span>
          </div>
        )}

        {/* Schedule List */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-foreground block px-1">
            Payment Schedule & Invoices
          </span>

          <div className="rounded-lg border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
            {scheduleItems.map((item, idx) => {
              const remaining = item.remaining_amount !== undefined ? item.remaining_amount : item.amount;
              const isPaid = item.status === "PAID" || remaining <= 0;
              const isUnderVerification = !!item.is_under_verification;
              const latestRejected = item.latest_rejected_payment;

              return (
                <div
                  key={item.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/15 transition-colors text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground text-[11px]">
                        #{idx + 1}
                      </span>
                      <span className="font-medium text-foreground">{item.title}</span>
                      {isUnderVerification ? (
                        <BillingStatusBadge status="UNDER_VERIFICATION" />
                      ) : latestRejected ? (
                        <BillingStatusBadge status="FAILED" label="Verification failed" />
                      ) : (
                        <BillingStatusBadge status={item.status} />
                      )}
                    </div>

                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
                      {item.due_date ? (
                        <span>Due: {formatPaymentDate(item.due_date)}</span>
                      ) : (
                        <span>Due on milestone completion</span>
                      )}
                      {Boolean(item.paid_amount && item.paid_amount > 0 && !isPaid) && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">
                            Paid: {formatCurrency(item.paid_amount || 0, item.currency)}
                          </span>
                        </>
                      )}
                      {isUnderVerification && (
                        <span className="text-amber-400">
                          • Awaiting verification
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right font-mono">
                      <span className="font-bold text-foreground block">
                        {formatCurrency(item.amount, item.currency)}
                      </span>
                      {!isPaid && (
                        <span className={`text-[10px] block ${isUnderVerification ? "text-amber-400" : "text-muted-foreground"}`}>
                          {isUnderVerification ? "Under Review: " : "Due: "}
                          {formatCurrency(remaining, item.currency)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 font-sans">
                      {!isPaid && onPayItem && (
                        <>
                          {isUnderVerification ? (
                            <Button
                              size="sm"
                              disabled
                              className="h-7 text-xs px-2.5 bg-secondary/60 text-muted-foreground border border-border/80 cursor-not-allowed opacity-50 select-none pointer-events-none"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse mr-1" />
                              <span>Verification Pending</span>
                            </Button>
                          ) : latestRejected ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                onClose();
                                onPayItem({
                                  id: item.id,
                                  title: item.title,
                                  amount: remaining,
                                  currency: item.currency,
                                  dueDate: item.due_date,
                                  projectName: plan.project?.name,
                                  initialTab: "BANK_TRANSFER",
                                });
                              }}
                              className="h-7 text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                            >
                              Pay Again
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                onClose();
                                onPayItem({
                                  id: item.id,
                                  title: item.title,
                                  amount: remaining,
                                  currency: item.currency,
                                  dueDate: item.due_date,
                                  projectName: plan.project?.name,
                                });
                              }}
                              className="h-7 text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                            >
                              Pay
                            </Button>
                          )}
                        </>
                      )}

                      <Link
                        href={`/client/payments/${item.id}`}
                        className="inline-flex items-center justify-center rounded px-2.5 py-1 text-xs font-medium bg-secondary/80 text-foreground hover:bg-secondary transition-colors"
                      >
                        Invoice
                      </Link>

                      <a
                        href={`/api/payments/invoices/${item.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded border border-border/80 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                      >
                        <Download className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8"
          >
            Close Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
