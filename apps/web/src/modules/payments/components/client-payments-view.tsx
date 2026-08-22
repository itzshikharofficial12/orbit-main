"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Download,
  FileText,
  Building2,
  HelpCircle,
  ShieldCheck,
  Layers,
  Sparkles,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BillingStatusBadge } from "./billing-status-badge";
import { BillingTypeBadge } from "./billing-type-badge";
import { CompletePaymentModal, type CompletePaymentTarget } from "./complete-payment-modal";
import { ClientPlanScheduleModal } from "./client-plan-schedule-modal";
import { PaymentQueryModal } from "./payment-query-modal";
import { formatCurrency, formatPaymentDate } from "../utils";
import { createBrowserClient } from "@/lib/supabase/client";
import type {
  BillingPlanWithRelations,
  PaymentWithRelations,
  PaymentOverviewMetrics,
  Payment,
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
  const router = useRouter();

  // Modal states
  const [payingTarget, setPayingTarget] = React.useState<CompletePaymentTarget | null>(null);
  const [inspectingPlan, setInspectingPlan] = React.useState<BillingPlanWithRelations | null>(null);
  const [isQueryModalOpen, setIsQueryModalOpen] = React.useState(false);
  const [queryPreselectedId, setQueryPreselectedId] = React.useState<string | undefined>(undefined);

  // Navigation tab: 'upcoming' | 'overdue' | 'history'
  const [activeTab, setActiveTab] = React.useState<"upcoming" | "overdue" | "history">("upcoming");

  // Realtime subscription for instant synchronization when admin verifies/rejects
  React.useEffect(() => {
    try {
      const supabase = createBrowserClient();
      const channel = supabase
        .channel("client-payments-realtime-listener")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "payments",
          },
          () => {
            router.refresh();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "billing_schedule_items",
          },
          () => {
            router.refresh();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Fallback safely
    }
  }, [router]);

  // Fast direct lookup maps from payments prop to guarantee 100% payability reconciliation
  const pendingPaymentsByScheduleItemId = React.useMemo(() => {
    const map = new Map<string, Payment>();
    (payments || []).forEach((p) => {
      const st = (p.status || "").toUpperCase();
      if (
        (st === "PENDING" ||
          st === "PENDING_VERIFICATION" ||
          st === "UNDER_VERIFICATION" ||
          st === "VERIFICATION_PENDING" ||
          st === "SUBMITTED") &&
        p.billing_schedule_item_id
      ) {
        map.set(p.billing_schedule_item_id, p as unknown as Payment);
      }
    });
    return map;
  }, [payments]);

  const rejectedPaymentsByScheduleItemId = React.useMemo(() => {
    const map = new Map<string, Payment>();
    (payments || []).forEach((p) => {
      const st = (p.status || "").toUpperCase();
      if (
        (st === "FAILED" || st === "REJECTED") &&
        p.billing_schedule_item_id
      ) {
        const existing = map.get(p.billing_schedule_item_id);
        if (
          !existing ||
          new Date(p.created_at || p.submitted_at || 0).getTime() >
            new Date(existing.created_at || existing.submitted_at || 0).getTime()
        ) {
          map.set(p.billing_schedule_item_id, p as unknown as Payment);
        }
      }
    });
    return map;
  }, [payments]);

  // Current Date for relative calculations
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // 1. Extract all unpaid schedule items with calculated relative status
  const allUnpaidItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      planId: string;
      planName: string;
      billingType: string;
      projectName?: string;
      projectId?: string;
      title: string;
      amount: number;
      currency: string;
      dueDate: string | null;
      status: any;
      paidAmount: number;
      remainingAmount: number;
      daysRemaining: number | null;
      isOverdue: boolean;
      isUnderVerification: boolean;
      pendingVerificationPayment: Payment | null;
      latestRejectedPayment: Payment | null;
      relativeStatusText: string;
    }> = [];

    plans.forEach((plan) => {
      if (plan.status === "CANCELLED") return;

      (plan.schedule_items || []).forEach((it) => {
        const paidAmount = it.paid_amount || 0;
        const remainingAmount =
          it.remaining_amount !== undefined
            ? it.remaining_amount
            : Math.max(0, it.amount - paidAmount);

        // Find active pending verification payment from item OR direct lookup map
        const pendingPayment =
          it.pending_verification_payment ||
          pendingPaymentsByScheduleItemId.get(it.id) ||
          (it.payments || []).find((p) => {
            const st = (p.status || "").toUpperCase();
            return (
              st === "PENDING_VERIFICATION" ||
              st === "PENDING" ||
              st === "UNDER_VERIFICATION" ||
              st === "VERIFICATION_PENDING" ||
              st === "SUBMITTED"
            );
          }) ||
          null;

        const isUnderVerification = !!pendingPayment;

        const latestRejected =
          it.latest_rejected_payment ||
          rejectedPaymentsByScheduleItemId.get(it.id) ||
          null;

        if (it.status !== "PAID" && remainingAmount > 0) {
          let daysRemaining: number | null = null;
          let isOverdue = false;
          let relativeStatusText = "Scheduled";

          if (isUnderVerification) {
            relativeStatusText = "Verification Pending";
          } else if (latestRejected) {
            relativeStatusText = "Verification failed";
          } else if (it.due_date) {
            const dueDate = new Date(it.due_date);
            dueDate.setHours(0, 0, 0, 0);
            const diffTime = dueDate.getTime() - today.getTime();
            daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (daysRemaining < 0) {
              isOverdue = true;
              const absDays = Math.abs(daysRemaining);
              relativeStatusText = absDays === 1 ? "Overdue by 1 day" : `Overdue by ${absDays} days`;
            } else if (daysRemaining === 0) {
              relativeStatusText = "Due today";
            } else if (daysRemaining === 1) {
              relativeStatusText = "Due tomorrow";
            } else {
              relativeStatusText = `Due in ${daysRemaining} days`;
            }
          }

          items.push({
            id: it.id,
            planId: plan.id,
            planName: plan.name,
            billingType: plan.billing_type,
            projectName: plan.project?.name,
            projectId: plan.project_id || undefined,
            title: it.title,
            amount: it.amount,
            currency: it.currency,
            dueDate: it.due_date,
            status: it.status,
            paidAmount,
            remainingAmount,
            daysRemaining,
            isOverdue,
            isUnderVerification,
            pendingVerificationPayment: pendingPayment,
            latestRejectedPayment: latestRejected,
            relativeStatusText,
          });
        }
      });
    });

    return items.sort((a, b) => {
      // Prioritize items under verification, then overdue, then earliest due date
      if (a.isUnderVerification && !b.isUnderVerification) return -1;
      if (!a.isUnderVerification && b.isUnderVerification) return 1;
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [plans, today, pendingPaymentsByScheduleItemId, rejectedPaymentsByScheduleItemId]);

  const [showAllFutureItems, setShowAllFutureItems] = React.useState(false);

  // 2. Primary Next Payment (The single most urgent receivable or active transfer under review)
  const nextPaymentItem = allUnpaidItems[0] || null;
  const futureScheduleItems = React.useMemo(() => allUnpaidItems.slice(1), [allUnpaidItems]);
  const displayedFutureItems = showAllFutureItems
    ? futureScheduleItems
    : futureScheduleItems.slice(0, 4);

  // 3. Filtered Lists
  const overdueItems = React.useMemo(() => {
    return allUnpaidItems.filter((i) => i.isOverdue || i.status === "OVERDUE");
  }, [allUnpaidItems]);

  // Query item options for support modal
  const queryItemOptions = React.useMemo(() => {
    return allUnpaidItems.map((i) => ({
      id: i.id,
      title: i.title,
      amount: i.remainingAmount,
      currency: i.currency,
      projectId: i.projectId,
    }));
  }, [allUnpaidItems]);

  const defaultProjectId = plans[0]?.project_id || undefined;
  const hasUnderReview =
    metrics.pendingVerificationCount > 0 ||
    pendingPaymentsByScheduleItemId.size > 0 ||
    allUnpaidItems.some((i) => i.isUnderVerification);
  const totalUnderReviewCount = Math.max(
    metrics.pendingVerificationCount,
    pendingPaymentsByScheduleItemId.size,
    allUnpaidItems.filter((i) => i.isUnderVerification).length
  );

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MOBILE DEDICATED PAYMENTS DASHBOARD (< 768px)                          */}
      {/* ========================================================================= */}
      <div className="md:hidden space-y-5">
        {/* 0. Contextual Under-Verification Banner (if any item is awaiting review) */}
        {hasUnderReview && (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="font-semibold font-mono">
                {totalUnderReviewCount === 1
                  ? "1 payment awaiting verification"
                  : `${totalUnderReviewCount} payments awaiting verification`}
              </span>
            </div>
            {metrics.underVerificationAmount > 0 && (
              <span className="font-mono font-bold">
                {formatCurrency(metrics.underVerificationAmount, metrics.currency)}
              </span>
            )}
          </div>
        )}

        {/* 1. Compact Single-Line Tabs: Upcoming 5 | Overdue | History 3 */}
        <div className="border-b border-border/60">
          <nav className="flex space-x-1" aria-label="Payment Sections">
            <button
              type="button"
              onClick={() => setActiveTab("upcoming")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] cursor-pointer whitespace-nowrap ${
                activeTab === "upcoming"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Upcoming</span>
              {allUnpaidItems.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-secondary font-mono font-semibold">
                  {allUnpaidItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("overdue")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] cursor-pointer whitespace-nowrap ${
                activeTab === "overdue"
                  ? "border-destructive text-destructive font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Overdue</span>
              {overdueItems.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-destructive/15 text-destructive font-mono font-semibold">
                  {overdueItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] cursor-pointer whitespace-nowrap ${
                activeTab === "history"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>History</span>
              {payments.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-secondary font-mono font-semibold">
                  {payments.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* 2. TAB 1: UPCOMING (NEXT PAYMENT + COMPACT FUTURE SCHEDULE) */}
        {activeTab === "upcoming" && (
          <div className="space-y-6">
            {/* SECTION A: NEXT PAYMENT (Single Prominent Card) */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted-foreground block">
                Next Payment
              </span>

              {nextPaymentItem ? (
                <div
                  className={`p-4 sm:p-5 rounded-2xl border bg-card space-y-3.5 shadow-sm transition-colors ${
                    nextPaymentItem.isUnderVerification
                      ? "border-amber-500/40 bg-card"
                      : nextPaymentItem.latestRejectedPayment
                      ? "border-destructive/40 bg-card"
                      : "border-border/90 ring-1 ring-border/50"
                  }`}
                >
                  {/* Eyebrow: Plan/Item Name + Billing Type */}
                  <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider">
                    <span className="font-semibold text-foreground truncate">
                      {nextPaymentItem.title}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground text-[10px] font-medium shrink-0 ml-2">
                      {nextPaymentItem.billingType || "Recurring"}
                    </span>
                  </div>

                  {/* Amount + Due Date */}
                  <div className="space-y-1">
                    <span className="text-3xl sm:text-[34px] font-extrabold font-mono text-foreground block tracking-tight leading-none">
                      {formatCurrency(nextPaymentItem.remainingAmount, nextPaymentItem.currency)}
                    </span>
                    {nextPaymentItem.dueDate && (
                      <p className="text-sm font-mono text-muted-foreground">
                        Due {formatPaymentDate(nextPaymentItem.dueDate)}
                      </p>
                    )}
                  </div>

                  {/* Verification Pending Subtext */}
                  {nextPaymentItem.isUnderVerification && (
                    <div className="pt-1.5 space-y-0.5 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-xs font-mono text-amber-400 font-semibold">
                          ● Verification pending
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Bank transfer submitted · Under review
                      </p>
                    </div>
                  )}

                  {/* Rejection Notice */}
                  {nextPaymentItem.latestRejectedPayment && (
                    <div className="pt-1.5 space-y-0.5 border-t border-border/40">
                      <span className="text-xs font-mono text-destructive font-semibold block">
                        ✕ Verification failed
                      </span>
                      <p className="text-xs text-destructive/90 truncate">
                        Reason: {nextPaymentItem.latestRejectedPayment.rejection_reason || "Bank reference could not be verified."}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-1">
                    {nextPaymentItem.isUnderVerification ? (
                      <Button
                        size="sm"
                        disabled
                        className="w-full h-10 text-xs font-semibold bg-secondary/60 text-muted-foreground border border-border/80 cursor-not-allowed opacity-50 select-none pointer-events-none"
                      >
                        <span>Verification pending</span>
                      </Button>
                    ) : nextPaymentItem.latestRejectedPayment ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          setPayingTarget({
                            id: nextPaymentItem.id,
                            title: nextPaymentItem.title,
                            amount: nextPaymentItem.remainingAmount,
                            currency: nextPaymentItem.currency,
                            dueDate: nextPaymentItem.dueDate,
                            projectName: nextPaymentItem.projectName,
                            initialTab: "BANK_TRANSFER",
                          })
                        }
                        className="w-full h-10 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
                      >
                        <span>Pay Again</span>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          setPayingTarget({
                            id: nextPaymentItem.id,
                            title: nextPaymentItem.title,
                            amount: nextPaymentItem.remainingAmount,
                            currency: nextPaymentItem.currency,
                            dueDate: nextPaymentItem.dueDate,
                            projectName: nextPaymentItem.projectName,
                          })
                        }
                        className="w-full h-10 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
                      >
                        <span>Pay Now</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/80 bg-card/30 p-6 text-center text-xs text-muted-foreground">
                  You&apos;re all caught up. No upcoming payments scheduled.
                </div>
              )}
            </div>

            {/* SECTION B: FUTURE PAYMENTS SCHEDULE (Compact Vertical List) */}
            {futureScheduleItems.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted-foreground">
                    Upcoming schedule
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {futureScheduleItems.length} payment{futureScheduleItems.length === 1 ? "" : "s"} scheduled
                  </span>
                </div>

                <div className="rounded-2xl border border-border/80 bg-card overflow-hidden divide-y divide-border/40 shadow-xs">
                  {displayedFutureItems.map((item) => (
                    <div
                      key={item.id}
                      className="px-4 py-3.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <span className="font-semibold text-foreground block truncate">
                          {item.title}
                        </span>
                        {item.dueDate && (
                          <span className="text-[11px] font-mono text-muted-foreground block">
                            {formatPaymentDate(item.dueDate)}
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <span className="font-bold text-foreground block">
                          {formatCurrency(item.remainingAmount, item.currency)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/80 block">
                          {item.billingType ? item.billingType.charAt(0) + item.billingType.slice(1).toLowerCase() : "Scheduled"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* View All Payments Toggle */}
                {futureScheduleItems.length > 4 && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAllFutureItems(!showAllFutureItems)}
                      className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>{showAllFutureItems ? "Show less" : `View all ${futureScheduleItems.length} future payments`}</span>
                      <ArrowRight className={`h-3 w-3 transition-transform ${showAllFutureItems ? "rotate-90" : ""}`} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. TAB 2: OVERDUE (Streamlined Cards) */}
        {activeTab === "overdue" && (
          <div className="space-y-3.5">
            {overdueItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-6 text-center text-xs text-muted-foreground">
                No overdue payments. All billing milestones are on track.
              </div>
            ) : (
              overdueItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-destructive/35 bg-card space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider font-semibold">
                    <span className="text-destructive truncate font-semibold">
                      {item.title}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-mono shrink-0 ml-2">
                      OVERDUE
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-2xl font-extrabold font-mono text-destructive block tracking-tight">
                      {formatCurrency(item.remainingAmount, item.currency)}
                    </span>
                    {item.dueDate && (
                      <p className="text-xs font-mono text-muted-foreground">
                        Due {formatPaymentDate(item.dueDate)}
                      </p>
                    )}
                  </div>

                  {item.isUnderVerification ? (
                    <div className="pt-1 space-y-0.5 border-t border-border/40">
                      <span className="text-[11px] font-mono text-amber-400 font-semibold block">
                        ● Verification pending
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Your bank transfer is being reviewed.
                      </p>
                    </div>
                  ) : item.latestRejectedPayment ? (
                    <div className="pt-1 space-y-0.5 border-t border-border/40">
                      <span className="text-[11px] font-mono text-destructive font-semibold block">
                        ✕ Verification failed
                      </span>
                      <p className="text-[11px] text-destructive/90 truncate">
                        Reason: {item.latestRejectedPayment.rejection_reason || "Bank reference could not be verified."}
                      </p>
                    </div>
                  ) : null}

                  <div className="pt-2 border-t border-border/40">
                    {item.isUnderVerification ? (
                      <Button
                        size="sm"
                        disabled
                        className="w-full h-9 text-xs font-semibold bg-secondary/60 text-muted-foreground border border-border/80 cursor-not-allowed opacity-50 select-none pointer-events-none"
                      >
                        <span>Verification pending</span>
                      </Button>
                    ) : item.latestRejectedPayment ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          setPayingTarget({
                            id: item.id,
                            title: item.title,
                            amount: item.remainingAmount,
                            currency: item.currency,
                            dueDate: item.dueDate,
                            projectName: item.projectName,
                            initialTab: "BANK_TRANSFER",
                          })
                        }
                        className="w-full h-9 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
                      >
                        <span>Pay Again</span>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          setPayingTarget({
                            id: item.id,
                            title: item.title,
                            amount: item.remainingAmount,
                            currency: item.currency,
                            dueDate: item.dueDate,
                            projectName: item.projectName,
                          })
                        }
                        className="w-full h-9 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
                      >
                        <span>Pay Now</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 4. TAB 3: HISTORY (Compact settled rows) */}
        {activeTab === "history" && (
          <div className="space-y-2.5">
            {payments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-6 text-center text-xs text-muted-foreground">
                No payment history yet.
              </div>
            ) : (
              payments.map((p) => {
                const isVerified = p.status === "PAID";
                const isUnderReview = p.status === "PENDING_VERIFICATION" || p.status === "PENDING";
                const isRejected = p.status === "FAILED";

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {p.schedule_item?.title || "Payment"}
                      </span>
                      <span
                        className={`text-xs font-bold font-mono ${
                          isVerified
                            ? "text-emerald-400"
                            : isUnderReview
                            ? "text-amber-400"
                            : "text-destructive"
                        }`}
                      >
                        {formatCurrency(p.amount, p.currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-0.5">
                      {isVerified ? (
                        <span className="text-emerald-400 font-medium">
                          ✓ Settled · {formatPaymentDate(p.verified_at || p.paid_at || p.created_at)}
                        </span>
                      ) : isUnderReview ? (
                        <span className="text-amber-400 font-medium">
                          ● Under Review · {formatPaymentDate(p.submitted_at || p.created_at)}
                        </span>
                      ) : (
                        <span className="text-destructive font-medium">
                          ✕ Rejected · {formatPaymentDate(p.submitted_at || p.created_at)}
                        </span>
                      )}

                      {isVerified && (
                        <a
                          href={`/api/payments/receipts/${p.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-sans text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0 ml-2"
                        >
                          Receipt →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 5. Help / Query on Mobile */}
        <div className="p-4 rounded-2xl border border-border/70 bg-secondary/15 flex items-center justify-between gap-3 mt-4">
          <div className="space-y-0.5">
            <h4 className="text-xs font-semibold text-foreground">Need payment help?</h4>
            <p className="text-[11px] text-muted-foreground">Raise a query about an invoice or schedule.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setQueryPreselectedId(undefined);
              setIsQueryModalOpen(true);
            }}
            className="h-8 text-xs px-3 text-foreground hover:bg-secondary shrink-0 cursor-pointer"
          >
            Raise Query
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. APPROVED DESKTOP / LAPTOP PAYMENTS DASHBOARD (>= 768px)                */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-8 max-w-5xl">
        {/* 0. MINIMALIST CONTEXTUAL HEADER BADGE (Only shown when payments are under verification) */}
        {hasUnderReview && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div className="space-y-0.5">
                <span className="font-semibold font-mono text-amber-300 block sm:inline">
                  {totalUnderReviewCount === 1
                    ? "1 payment awaiting verification"
                    : `${totalUnderReviewCount} payments awaiting verification`}
                </span>
                <span className="text-amber-200/70 hidden sm:inline sm:ml-2">
                  • Your payment has been submitted and is currently being verified by Celestia Studios.
                </span>
              </div>
            </div>

            {metrics.underVerificationAmount > 0 && (
              <span className="font-mono font-bold text-amber-300 text-sm">
                {formatCurrency(metrics.underVerificationAmount, metrics.currency)}
              </span>
            )}
          </div>
        )}

        {/* 1. HERO — NEXT PAYMENT / ACTIVE UNDER VERIFICATION */}
        {nextPaymentItem ? (
          <div
            className={`relative overflow-hidden rounded-xl border p-6 sm:p-7 shadow-lg transition-colors ${
              nextPaymentItem.isUnderVerification
                ? "border-amber-500/30 bg-card"
                : nextPaymentItem.latestRejectedPayment
                ? "border-destructive/30 bg-card"
                : "border-border/80 bg-card"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    Next Payment
                  </span>

                  {nextPaymentItem.projectName && (
                    <span className="text-xs text-muted-foreground">
                      {nextPaymentItem.projectName}
                    </span>
                  )}

                  {nextPaymentItem.isUnderVerification ? (
                    <BillingStatusBadge status="UNDER_VERIFICATION" />
                  ) : nextPaymentItem.latestRejectedPayment ? (
                    <BillingStatusBadge status="FAILED" label="Verification failed" />
                  ) : (
                    <span
                      className={`text-[11px] font-medium font-mono px-2 py-0.5 rounded ${
                        nextPaymentItem.isOverdue
                          ? "bg-destructive/15 text-destructive border border-destructive/30"
                          : nextPaymentItem.daysRemaining === 0
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {nextPaymentItem.relativeStatusText}
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {nextPaymentItem.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Plan: {nextPaymentItem.planName}
                  </p>
                </div>

                <div className="flex items-baseline gap-3 pt-1">
                  <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground">
                    {formatCurrency(nextPaymentItem.remainingAmount, nextPaymentItem.currency)}
                  </span>
                  {nextPaymentItem.dueDate && !nextPaymentItem.isUnderVerification && (
                    <span className="text-xs text-muted-foreground font-mono">
                      Due {formatPaymentDate(nextPaymentItem.dueDate)}
                    </span>
                  )}
                  {nextPaymentItem.isUnderVerification && nextPaymentItem.pendingVerificationPayment && (
                    <span className="text-xs text-amber-400/90 font-mono">
                      Submitted {formatPaymentDate(nextPaymentItem.pendingVerificationPayment.submitted_at || nextPaymentItem.pendingVerificationPayment.created_at)}
                    </span>
                  )}
                </div>

                {/* Informative Subtitle for Status */}
                {nextPaymentItem.isUnderVerification && (
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground/90">Payment submitted successfully.</p>
                    <p>Your payment is currently being verified by Celestia Studios.</p>
                  </div>
                )}

                {/* Rejection Notice */}
                {nextPaymentItem.latestRejectedPayment && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-xs text-destructive space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Payment verification failed</span>
                    </div>
                    <p className="text-[11px] text-destructive/90 pl-5">
                      Reason: {nextPaymentItem.latestRejectedPayment.rejection_reason || "Bank reference number could not be verified."}
                    </p>
                  </div>
                )}
              </div>

              {/* Primary Action Button */}
              <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2.5 shrink-0">
                {nextPaymentItem.isUnderVerification ? (
                  <Button
                    size="lg"
                    disabled
                    className="h-11 px-6 text-xs font-semibold gap-2 bg-secondary/60 text-muted-foreground border border-border/80 cursor-not-allowed opacity-50 select-none pointer-events-none"
                  >
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span>Verification Pending</span>
                  </Button>
                ) : nextPaymentItem.latestRejectedPayment ? (
                  <Button
                    size="lg"
                    onClick={() =>
                      setPayingTarget({
                        id: nextPaymentItem.id,
                        title: nextPaymentItem.title,
                        amount: nextPaymentItem.remainingAmount,
                        currency: nextPaymentItem.currency,
                        dueDate: nextPaymentItem.dueDate,
                        projectName: nextPaymentItem.projectName,
                        initialTab: "BANK_TRANSFER",
                      })
                    }
                    className="h-11 px-6 text-sm font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Pay Again</span>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() =>
                      setPayingTarget({
                        id: nextPaymentItem.id,
                        title: nextPaymentItem.title,
                        amount: nextPaymentItem.remainingAmount,
                        currency: nextPaymentItem.currency,
                        dueDate: nextPaymentItem.dueDate,
                        projectName: nextPaymentItem.projectName,
                      })
                    }
                    className="h-11 px-6 text-sm font-semibold gap-2 shadow-md cursor-pointer"
                  >
                    <span>Pay Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}

                <div className="flex items-center justify-center gap-2">
                  <Link
                    href={`/client/payments/${nextPaymentItem.id}`}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                  >
                    View Invoice
                  </Link>
                  <span className="text-muted-foreground/40">•</span>
                  <a
                    href={`/api/payments/invoices/${nextPaymentItem.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 bg-card/60 p-6 sm:p-8 text-center space-y-2.5">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">You&apos;re all caught up.</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No upcoming payments are scheduled at this time. All commercial milestones are settled.
            </p>
          </div>
        )}

        {/* 2. TRANSPARENT PAYMENT SUMMARY CARDS */}
        <div className={`grid gap-3 ${hasUnderReview ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}>
          <div className="p-4 rounded-xl border border-border/70 bg-card space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 font-mono block">
              Total Paid
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400 block truncate">
              {formatCurrency(metrics.collected, metrics.currency)}
            </span>
            <span className="text-[11px] text-muted-foreground block">Verified settled</span>
          </div>

          {hasUnderReview && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 font-mono block">
                Under Review
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-amber-400 block truncate">
                {formatCurrency(metrics.underVerificationAmount, metrics.currency)}
              </span>
              <span className="text-[11px] text-muted-foreground block">Awaiting verification</span>
            </div>
          )}

          <div className="p-4 rounded-xl border border-border/70 bg-card space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono block">
              Outstanding
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-foreground block truncate">
              {formatCurrency(metrics.outstanding, metrics.currency)}
            </span>
            <span className="text-[11px] text-muted-foreground block">Remaining balance</span>
          </div>

          <div className="p-4 rounded-xl border border-border/70 bg-card space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono block">
              Next Due
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-foreground block truncate">
              {nextPaymentItem ? formatCurrency(nextPaymentItem.remainingAmount, nextPaymentItem.currency) : "₹0"}
            </span>
            <span className="text-[11px] text-muted-foreground block truncate">
              {nextPaymentItem?.isUnderVerification
                ? "Verification Pending"
                : nextPaymentItem?.dueDate
                ? formatPaymentDate(nextPaymentItem.dueDate)
                : "No dues"}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border/70 bg-card space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono block">
              Total Billed
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-foreground block truncate">
              {formatCurrency(metrics.totalContractValue, metrics.currency)}
            </span>
            <span className="text-[11px] text-muted-foreground block">Contract total</span>
          </div>
        </div>

        {/* 3. SEGMENTED NAVIGATION TABS */}
        <div className="space-y-4">
          <div className="border-b border-border/60">
            <nav className="flex space-x-2" aria-label="Payment Sections">
              <button
                type="button"
                onClick={() => setActiveTab("upcoming")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-[1px] cursor-pointer ${
                  activeTab === "upcoming"
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Upcoming</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-secondary font-mono">
                  {allUnpaidItems.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("overdue")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-[1px] cursor-pointer ${
                  activeTab === "overdue"
                    ? "border-destructive text-destructive font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Overdue</span>
                {overdueItems.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-destructive/15 text-destructive font-mono font-semibold">
                    {overdueItems.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-[1px] cursor-pointer ${
                  activeTab === "history"
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Payment History</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-secondary font-mono">
                  {payments.length}
                </span>
              </button>
            </nav>
          </div>

          {/* TAB 1: UPCOMING (GROUPED COMMERCIAL PLANS) */}
          {activeTab === "upcoming" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Upcoming Payments</h3>
                <p className="text-xs text-muted-foreground">
                  Your scheduled payments and upcoming billing milestones.
                </p>
              </div>

              {plans.length === 0 || allUnpaidItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-8 text-center text-xs text-muted-foreground">
                  No upcoming payments scheduled.
                </div>
              ) : (
                <div className="space-y-3">
                  {plans
                    .filter((plan) => plan.status !== "CANCELLED" && (plan.total_outstanding || 0) > 0)
                    .map((plan) => {
                      const planScheduleItems = plan.schedule_items || [];
                      const unpaidItems = planScheduleItems.filter(
                        (i) => i.status !== "PAID" && (i.remaining_amount === undefined || i.remaining_amount > 0)
                      );
                      const nextItemInPlan = unpaidItems[0];
                      const completedMilestones = planScheduleItems.filter(
                        (i) => i.status === "PAID" || i.status === "WAIVED"
                      ).length;

                      return (
                        <div
                          key={plan.id}
                          className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card hover:border-border transition-colors space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground truncate">
                                  {plan.name}
                                </span>
                                <BillingTypeBadge type={plan.billing_type} />
                              </div>

                              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                {plan.project && <span>{plan.project.name}</span>}
                                {plan.billing_type === "INSTALLMENTS" && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {completedMilestones} of {planScheduleItems.length} milestones completed
                                    </span>
                                  </>
                                )}
                                {plan.billing_type === "RECURRING" && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {unpaidItems.length} cycle{unpaidItems.length === 1 ? "" : "s"} remaining
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {(() => {
                              const isNextItemUnderVerification =
                                nextItemInPlan?.is_under_verification ||
                                (nextItemInPlan ? !!pendingPaymentsByScheduleItemId.get(nextItemInPlan.id) : false) ||
                                (nextItemInPlan?.payments || []).some((p) => {
                                  const st = (p.status || "").toUpperCase();
                                  return (
                                    st === "PENDING" ||
                                    st === "PENDING_VERIFICATION" ||
                                    st === "UNDER_VERIFICATION" ||
                                    st === "VERIFICATION_PENDING" ||
                                    st === "SUBMITTED"
                                  );
                                });

                              const nextItemRejected =
                                nextItemInPlan?.latest_rejected_payment ||
                                (nextItemInPlan ? rejectedPaymentsByScheduleItemId.get(nextItemInPlan.id) : null) ||
                                null;

                              return (
                                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                                  <div className="text-right font-mono">
                                    <span className="text-xs font-bold text-foreground block">
                                      {nextItemInPlan
                                        ? formatCurrency(
                                            nextItemInPlan.remaining_amount || nextItemInPlan.amount,
                                            nextItemInPlan.currency
                                          )
                                        : "Settled"}
                                    </span>
                                    {isNextItemUnderVerification ? (
                                      <span className="text-[10px] text-amber-400 font-mono block">
                                        Verification Pending
                                      </span>
                                    ) : nextItemInPlan?.due_date ? (
                                      <span className="text-[10px] text-muted-foreground block">
                                        Next: {formatPaymentDate(nextItemInPlan.due_date)}
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center gap-1.5 font-sans">
                                    {nextItemInPlan && (
                                      <>
                                        {isNextItemUnderVerification ? (
                                          <Button
                                            size="sm"
                                            disabled
                                            className="h-7 text-xs px-2.5 bg-secondary/60 text-muted-foreground border border-border/80 cursor-not-allowed opacity-50 select-none pointer-events-none"
                                          >
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse mr-1" />
                                            <span>Verification Pending</span>
                                          </Button>
                                        ) : nextItemRejected ? (
                                          <Button
                                            size="sm"
                                            onClick={() =>
                                              setPayingTarget({
                                                id: nextItemInPlan.id,
                                                title: nextItemInPlan.title,
                                                amount:
                                                  nextItemInPlan.remaining_amount || nextItemInPlan.amount,
                                                currency: nextItemInPlan.currency,
                                                dueDate: nextItemInPlan.due_date,
                                                projectName: plan.project?.name,
                                                initialTab: "BANK_TRANSFER",
                                              })
                                            }
                                            className="h-7 text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                                          >
                                            Pay Again
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            onClick={() =>
                                              setPayingTarget({
                                                id: nextItemInPlan.id,
                                                title: nextItemInPlan.title,
                                                amount:
                                                  nextItemInPlan.remaining_amount || nextItemInPlan.amount,
                                                currency: nextItemInPlan.currency,
                                                dueDate: nextItemInPlan.due_date,
                                                projectName: plan.project?.name,
                                              })
                                            }
                                            className="h-7 text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                                          >
                                            Pay
                                          </Button>
                                        )}
                                      </>
                                    )}

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setInspectingPlan(plan)}
                                      className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                      <span>View Schedule</span>
                                      <ArrowRight className="h-3 w-3 ml-1" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OVERDUE */}
          {activeTab === "overdue" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-destructive">Overdue Payments</h3>
                <p className="text-xs text-muted-foreground">
                  Invoices past their scheduled due date requiring settlement.
                </p>
              </div>

              {overdueItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-8 text-center text-xs text-muted-foreground">
                  No overdue payments. All billing milestones are on track.
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-destructive/40 bg-destructive/5 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">{item.title}</span>
                            {item.isUnderVerification ? (
                              <BillingStatusBadge status="UNDER_VERIFICATION" />
                            ) : item.latestRejectedPayment ? (
                              <BillingStatusBadge status="FAILED" label="Verification failed" />
                            ) : (
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-destructive/20 text-destructive border border-destructive/30">
                                {item.relativeStatusText}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
                            {item.projectName && <span>{item.projectName}</span>}
                            {item.dueDate && <span>• Due: {formatPaymentDate(item.dueDate)}</span>}
                            {item.isUnderVerification && (
                              <span>• Awaiting Celestia Studios verification</span>
                            )}
                          </div>
                          {item.latestRejectedPayment && (
                            <p className="text-xs text-destructive/90 pt-1">
                              Rejection Reason: {item.latestRejectedPayment.rejection_reason || "Reference could not be verified."}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <span className="text-sm font-bold font-mono text-destructive">
                            {formatCurrency(item.remainingAmount, item.currency)}
                          </span>

                          <div className="flex items-center gap-1.5 font-sans">
                            {item.isUnderVerification ? (
                              <Button
                                size="sm"
                                disabled
                                className="h-7 text-xs px-2.5 bg-secondary/60 text-muted-foreground border border-border/80 cursor-not-allowed opacity-50 select-none pointer-events-none"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse mr-1" />
                                <span>Verification Pending</span>
                              </Button>
                            ) : item.latestRejectedPayment ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  setPayingTarget({
                                    id: item.id,
                                    title: item.title,
                                    amount: item.remainingAmount,
                                    currency: item.currency,
                                    dueDate: item.dueDate,
                                    projectName: item.projectName,
                                    initialTab: "BANK_TRANSFER",
                                  })
                                }
                                className="h-7 text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                              >
                                Pay Again
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() =>
                                  setPayingTarget({
                                    id: item.id,
                                    title: item.title,
                                    amount: item.remainingAmount,
                                    currency: item.currency,
                                    dueDate: item.dueDate,
                                    projectName: item.projectName,
                                  })
                                }
                                className="h-7 text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                              >
                                Pay Now
                              </Button>
                            )}

                            <Link
                              href={`/client/payments/${item.id}`}
                              className="inline-flex items-center justify-center rounded px-2.5 py-1 text-xs font-medium bg-secondary/80 text-foreground hover:bg-secondary transition-colors"
                            >
                              Invoice
                            </Link>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setQueryPreselectedId(item.id);
                                setIsQueryModalOpen(true);
                              }}
                              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <HelpCircle className="h-3.5 w-3.5 mr-1" />
                              <span>Question</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENT HISTORY (Verified, Under Verification, and Rejected) */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
                <p className="text-xs text-muted-foreground">
                  Authoritative record of verified transactions, pending reviews, and submitted receipts.
                </p>
              </div>

              {payments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-8 text-center text-xs text-muted-foreground">
                  No payment history yet.
                </div>
              ) : (
                <div className="rounded-xl border border-border/70 bg-card overflow-hidden divide-y divide-border/40">
                  {payments.map((p) => {
                    const isVerified = p.status === "PAID";
                    const isUnderReview = p.status === "PENDING_VERIFICATION" || p.status === "PENDING";
                    const isRejected = p.status === "FAILED";

                    return (
                      <div
                        key={p.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/15 transition-colors text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {p.schedule_item?.title || "Payment"}
                            </span>
                            <BillingStatusBadge status={p.status} />
                          </div>
                          <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2 font-mono">
                            <span>{p.method === "BANK_TRANSFER" ? "Bank Transfer" : "Online Payment"}</span>
                            {p.transaction_reference && <span>• Ref: {p.transaction_reference}</span>}
                            {isVerified && (
                              <span>• Verified {formatPaymentDate(p.verified_at || p.paid_at || p.created_at)}</span>
                            )}
                            {isUnderReview && (
                              <span>• Submitted {formatPaymentDate(p.submitted_at || p.paid_at || p.created_at)}</span>
                            )}
                            {isRejected && (
                              <span>• Submitted {formatPaymentDate(p.submitted_at || p.paid_at || p.created_at)}</span>
                            )}
                          </div>
                          {isRejected && p.rejection_reason && (
                            <p className="text-[11px] text-destructive italic pt-0.5">
                              Reason: &ldquo;{p.rejection_reason}&rdquo;
                            </p>
                          )}
                          {isUnderReview && (
                            <p className="text-[11px] text-amber-400/90 italic pt-0.5">
                              Awaiting admin verification from Celestia Studios
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <span
                            className={`text-sm font-bold font-mono ${
                              isVerified
                                ? "text-emerald-400"
                                : isUnderReview
                                ? "text-amber-400"
                                : "text-destructive"
                            }`}
                          >
                            {formatCurrency(p.amount, p.currency)}
                          </span>

                          <div className="flex items-center gap-1.5 font-sans">
                            {isVerified && (
                              <a
                                href={`/api/payments/receipts/${p.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded border border-border/80 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                              >
                                <Download className="h-3 w-3" />
                                <span>Receipt PDF</span>
                              </a>
                            )}

                            {isRejected && p.billing_schedule_item_id && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  setPayingTarget({
                                    id: p.billing_schedule_item_id!,
                                    title: p.schedule_item?.title || "Payment",
                                    amount: p.amount,
                                    currency: p.currency,
                                    initialTab: "BANK_TRANSFER",
                                  })
                                }
                                className="h-7 text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                              >
                                Pay Again
                              </Button>
                            )}

                            {p.billing_schedule_item_id && (
                              <Link
                                href={`/client/payments/${p.billing_schedule_item_id}`}
                                className="inline-flex items-center justify-center rounded border border-border/80 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                              >
                                Invoice
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. PAYMENT HELP / SUPPORT CARD */}
        <div className="p-4 sm:p-5 rounded-xl border border-border/60 bg-secondary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-primary" />
              <span>Need help with a payment?</span>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Have a question about an invoice, amount, or payment schedule?
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setQueryPreselectedId(undefined);
              setIsQueryModalOpen(true);
            }}
            className="h-8 text-xs px-3 text-foreground hover:bg-secondary shrink-0 cursor-pointer"
          >
            Raise a Payment Query
          </Button>
        </div>
      </div>

      {/* MODALS */}
      {payingTarget && (
        <CompletePaymentModal
          item={payingTarget}
          isOpen={!!payingTarget}
          onClose={() => setPayingTarget(null)}
          onSuccess={() => router.refresh()}
        />
      )}

      {inspectingPlan && (
        <ClientPlanScheduleModal
          plan={inspectingPlan}
          isOpen={!!inspectingPlan}
          onClose={() => setInspectingPlan(null)}
          onPayItem={(item) => setPayingTarget(item)}
        />
      )}

      {isQueryModalOpen && (
        <PaymentQueryModal
          isOpen={isQueryModalOpen}
          onClose={() => setIsQueryModalOpen(false)}
          items={queryItemOptions}
          preselectedItemId={queryPreselectedId}
          defaultProjectId={defaultProjectId}
        />
      )}
    </>
  );
}
