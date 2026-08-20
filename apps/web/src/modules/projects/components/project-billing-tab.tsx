"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  Plus,
  Eye,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileText,
  Building2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BillingTypeBadge } from "@/modules/payments/components/billing-type-badge";
import { BillingStatusBadge } from "@/modules/payments/components/billing-status-badge";
import { CreateBillingPlanDialog } from "@/modules/payments/components/create-billing-plan-dialog";
import { PlanDetailsModal } from "@/modules/payments/components/plan-details-modal";
import { formatCurrency, formatPaymentDate } from "@/modules/payments/utils";
import type {
  BillingPlanWithRelations,
  PaymentWithRelations,
} from "@/modules/payments/types";
import type { ProjectWithClient } from "@/modules/projects/types";

interface ProjectBillingTabProps {
  project: ProjectWithClient;
  billingOverview: {
    projectValue: number;
    totalCollected: number;
    totalOutstanding: number;
    nextDueItem: any;
    plans: BillingPlanWithRelations[];
    payments: PaymentWithRelations[];
  };
}

export function ProjectBillingTab({
  project,
  billingOverview,
}: ProjectBillingTabProps) {
  const [inspectingPlan, setInspectingPlan] = React.useState<BillingPlanWithRelations | null>(null);

  const { projectValue, totalCollected, totalOutstanding, nextDueItem, plans, payments } = billingOverview;

  const clientOption = project.client ? [{ id: project.client.id, name: project.client.name }] : [];
  const projectOption = [{ id: project.id, name: project.name, client_id: project.client_id }];

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Project Commercial & Billing
          </h2>
          <p className="text-xs text-muted-foreground">
            Contract value, milestone schedules, and payment ledger for {project.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {project.client && (
            <CreateBillingPlanDialog
              clients={clientOption as any}
              projects={projectOption as any}
              preselectedClientId={project.client.id}
              preselectedProjectId={project.id}
              trigger={
                <Button size="sm" className="h-8 gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Plan</span>
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* 2. Project Financial Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-card/60 border-border/80 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Project Value
          </span>
          <span className="text-base font-bold font-mono text-foreground block">
            {formatCurrency(projectValue, "INR")}
          </span>
          <span className="text-[10px] text-muted-foreground block">Total contract value</span>
        </Card>

        <Card className="p-3.5 bg-card/60 border-border/80 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 block">
            Total Paid
          </span>
          <span className="text-base font-bold font-mono text-emerald-400 block">
            {formatCurrency(totalCollected, "INR")}
          </span>
          <span className="text-[10px] text-muted-foreground block">Collected revenue</span>
        </Card>

        <Card className="p-3.5 bg-card/60 border-border/80 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Outstanding
          </span>
          <span className="text-base font-bold font-mono text-foreground block">
            {formatCurrency(totalOutstanding, "INR")}
          </span>
          <span className="text-[10px] text-muted-foreground block">Remaining balance</span>
        </Card>

        <Card className="p-3.5 bg-card/60 border-border/80 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Next Due
          </span>
          <span className="text-base font-bold font-mono text-foreground block">
            {nextDueItem ? formatCurrency(nextDueItem.amount, "INR") : "—"}
          </span>
          <span className="text-[10px] text-muted-foreground block truncate">
            {nextDueItem ? `Due ${formatPaymentDate(nextDueItem.due_date)}` : "No pending items"}
          </span>
        </Card>
      </div>

      {/* 3. Project Billing Plans */}
      <Card className="border-border/70 bg-card">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Billing Plans & Milestones</CardTitle>
              <CardDescription className="text-xs">
                Commercial billing structures attached to this project.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {plans.length} {plans.length === 1 ? "Plan" : "Plans"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {plans.length === 0 ? (
            <div className="text-center py-8 rounded-lg border border-dashed border-border/60 bg-secondary/10">
              <CreditCard className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground">No billing plans linked to this project yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/60 gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{plan.name}</span>
                      <BillingTypeBadge type={plan.billing_type} />
                      <BillingStatusBadge status={plan.status} />
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>{plan.schedule_items?.length || 0} scheduled invoices</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-foreground block">
                        {formatCurrency(plan.total_contract_value, plan.currency)}
                      </span>
                      <span className="text-[10px] text-emerald-400 block">
                        Paid: {formatCurrency(plan.total_collected || 0, plan.currency)}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInspectingPlan(plan)}
                      className="h-7 text-xs px-2.5"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      <span>View Schedule</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Payment History */}
      <Card className="border-border/70 bg-card">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Payment History</CardTitle>
              <CardDescription className="text-xs">
                Ledger of verified transactions for this project.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {payments.length} {payments.length === 1 ? "Payment" : "Payments"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground">No payments recorded for this project yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40 text-xs">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 hover:bg-secondary/20 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {p.schedule_item?.title || "Payment"}
                      </span>
                      <BillingStatusBadge status={p.status} />
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>Method: {p.method}</span>
                      {p.transaction_reference && (
                        <>
                          <span>•</span>
                          <span className="font-mono">Ref: {p.transaction_reference}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatPaymentDate(p.paid_at || p.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-foreground">
                      {formatCurrency(p.amount, p.currency)}
                    </span>

                    {p.status === "PAID" && (
                      <a
                        href={`/api/payments/receipts/${p.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2 gap-1">
                          <Download className="h-3 w-3" />
                          <span>Receipt</span>
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {inspectingPlan && (
        <PlanDetailsModal
          plan={inspectingPlan}
          open={!!inspectingPlan}
          onOpenChange={(open) => !open && setInspectingPlan(null)}
        />
      )}
    </div>
  );
}
