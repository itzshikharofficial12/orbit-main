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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BillingStatusBadge } from "./billing-status-badge";
import { BillingTypeBadge } from "./billing-type-badge";
import { CompletePaymentModal, type CompletePaymentTarget } from "./complete-payment-modal";
import { ClientPlanScheduleModal } from "./client-plan-schedule-modal";
import { PaymentQueryModal } from "./payment-query-modal";
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
  const router = useRouter();

  // Modal states
  const [payingTarget, setPayingTarget] = React.useState<CompletePaymentTarget | null>(null);
  const [inspectingPlan, setInspectingPlan] = React.useState<BillingPlanWithRelations | null>(null);
  const [isQueryModalOpen, setIsQueryModalOpen] = React.useState(false);
  const [queryPreselectedId, setQueryPreselectedId] = React.useState<string | undefined>(undefined);

  // Navigation tab: 'upcoming' | 'overdue' | 'paid'
  const [activeTab, setActiveTab] = React.useState<"upcoming" | "overdue" | "paid">("upcoming");

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
      relativeStatusText: string;
    }> = [];

    plans.forEach((plan) => {
      if (plan.status === "CANCELLED") return;

      (plan.schedule_items || []).forEach((it) => {
        const paidAmount = it.paid_amount || 0;
        const remainingAmount = it.remaining_amount !== undefined ? it.remaining_amount : Math.max(0, it.amount - paidAmount);

        if (it.status !== "PAID" && remainingAmount > 0) {
          let daysRemaining: number | null = null;
          let isOverdue = false;
          let relativeStatusText = "Scheduled";

          if (it.due_date) {
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
            relativeStatusText,
          });
        }
      });
    });

    return items.sort((a, b) => {
      // Prioritize overdue first, then earliest due date
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [plans, today]);

  // 2. Primary Next Payment (The single most urgent receivable)
  const nextPaymentItem = allUnpaidItems[0] || null;

  // 3. Filtered Lists
  const overdueItems = React.useMemo(() => {
    return allUnpaidItems.filter((i) => i.isOverdue || i.status === "OVERDUE");
  }, [allUnpaidItems]);

  const paidPayments = React.useMemo(() => {
    return payments.filter((p) => p.status === "PAID");
  }, [payments]);

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

  return (
    <div className="space-y-8 max-w-5xl">
      {/* 1. HERO — NEXT PAYMENT */}
      {nextPaymentItem ? (
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-6 sm:p-7 shadow-lg">
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
                {nextPaymentItem.dueDate && (
                  <span className="text-xs text-muted-foreground font-mono">
                    Due {formatPaymentDate(nextPaymentItem.dueDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2.5 shrink-0">
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
                className="h-11 px-6 text-sm font-semibold gap-2 shadow-md"
              >
                <span>Pay Now</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

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

      {/* 2. SIMPLE PAYMENT SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 font-mono block">
            Total Paid
          </span>
          <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400 block truncate">
            {formatCurrency(metrics.collected, metrics.currency)}
          </span>
          <span className="text-[11px] text-muted-foreground block">Verified settled</span>
        </div>

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
            {nextPaymentItem?.dueDate ? formatPaymentDate(nextPaymentItem.dueDate) : "No dues"}
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
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-[1px] ${
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
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-[1px] ${
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
              onClick={() => setActiveTab("paid")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-[1px] ${
                activeTab === "paid"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Payment History</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-secondary font-mono">
                {paidPayments.length}
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

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                            <div className="text-right font-mono">
                              <span className="text-xs font-bold text-foreground block">
                                {nextItemInPlan
                                  ? formatCurrency(nextItemInPlan.remaining_amount || nextItemInPlan.amount, nextItemInPlan.currency)
                                  : "Settled"}
                              </span>
                              {nextItemInPlan?.due_date && (
                                <span className="text-[10px] text-muted-foreground block">
                                  Next: {formatPaymentDate(nextItemInPlan.due_date)}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 font-sans">
                              {nextItemInPlan && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setPayingTarget({
                                      id: nextItemInPlan.id,
                                      title: nextItemInPlan.title,
                                      amount: nextItemInPlan.remaining_amount || nextItemInPlan.amount,
                                      currency: nextItemInPlan.currency,
                                      dueDate: nextItemInPlan.due_date,
                                      projectName: plan.project?.name,
                                    })
                                  }
                                  className="h-7 text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                  Pay
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setInspectingPlan(plan)}
                                className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground"
                              >
                                <span>View Schedule</span>
                                <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          </div>
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
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-destructive/20 text-destructive border border-destructive/30">
                            {item.relativeStatusText}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
                          {item.projectName && <span>{item.projectName}</span>}
                          {item.dueDate && <span>• Due: {formatPaymentDate(item.dueDate)}</span>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="text-sm font-bold font-mono text-destructive">
                          {formatCurrency(item.remainingAmount, item.currency)}
                        </span>

                        <div className="flex items-center gap-1.5 font-sans">
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
                            className="h-7 text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            Pay Now
                          </Button>

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
                            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
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

        {/* TAB 3: PAYMENT HISTORY */}
        {activeTab === "paid" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
              <p className="text-xs text-muted-foreground">
                Verified transaction receipts and settled invoices.
              </p>
            </div>

            {paidPayments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-8 text-center text-xs text-muted-foreground">
                No payment history yet.
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-card overflow-hidden divide-y divide-border/40">
                {paidPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/15 transition-colors text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {p.schedule_item?.title || "Settled Payment"}
                        </span>
                        <BillingStatusBadge status="PAID" />
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
                        <span>{p.method === "BANK_TRANSFER" ? "Direct Bank Wire" : "Online Payment"}</span>
                        {p.transaction_reference && <span>• Ref: {p.transaction_reference}</span>}
                        <span>• {formatPaymentDate(p.paid_at || p.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="text-sm font-bold font-mono text-emerald-400">
                        {formatCurrency(p.amount, p.currency)}
                      </span>

                      <div className="flex items-center gap-1.5 font-sans">
                        <a
                          href={`/api/payments/receipts/${p.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-border/80 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          <span>Receipt PDF</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
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
          className="h-8 text-xs px-3 text-foreground hover:bg-secondary shrink-0"
        >
          Raise a Payment Query
        </Button>
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
    </div>
  );
}
