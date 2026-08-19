"use client";

import * as React from "react";
import {
  Search,
  Plus,
  ArrowDownRight,
  CreditCard,
  Building2,
  FolderKanban,
  Calendar,
  Clock,
  Eye,
  CheckCircle2,
  Receipt,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BillingTypeBadge } from "./billing-type-badge";
import { BillingStatusBadge } from "./billing-status-badge";
import { CreateBillingPlanDialog } from "./create-billing-plan-dialog";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { PlanDetailsModal } from "./plan-details-modal";
import { formatCurrency, formatPaymentDate } from "../utils";
import type {
  BillingPlanWithRelations,
  PaymentWithRelations,
  PaymentOverviewMetrics,
  BillingType,
  BillingPlanStatus,
} from "../types";
import type { Client, Project, Milestone } from "@/lib/supabase/types";

interface AdminPaymentsDirectoryProps {
  initialPlans: BillingPlanWithRelations[];
  initialPayments: PaymentWithRelations[];
  metrics: PaymentOverviewMetrics;
  clients: Client[];
  projects: Project[];
  milestones?: Milestone[];
}

export function AdminPaymentsDirectory({
  initialPlans,
  initialPayments,
  metrics,
  clients,
  projects,
  milestones = [],
}: AdminPaymentsDirectoryProps) {
  const [tab, setTab] = React.useState<"PLANS" | "TRANSACTIONS">("PLANS");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedClientId, setSelectedClientId] = React.useState("ALL");
  const [selectedProjectId, setSelectedProjectId] = React.useState("ALL");
  const [selectedBillingType, setSelectedBillingType] = React.useState<BillingType | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState<BillingPlanStatus | "ALL">("ALL");

  // Active Plan Modal
  const [inspectingPlan, setInspectingPlan] = React.useState<BillingPlanWithRelations | null>(null);
  const [recordingForPlan, setRecordingForPlan] = React.useState<BillingPlanWithRelations | null>(null);

  // Filter projects by client
  const filteredProjects = React.useMemo(() => {
    if (selectedClientId === "ALL") return projects;
    return projects.filter((p) => p.client_id === selectedClientId);
  }, [projects, selectedClientId]);

  // Filter plans
  const displayedPlans = React.useMemo(() => {
    return initialPlans.filter((plan) => {
      if (selectedClientId !== "ALL" && plan.client_id !== selectedClientId) return false;
      if (selectedProjectId !== "ALL" && plan.project_id !== selectedProjectId) return false;
      if (selectedBillingType !== "ALL" && plan.billing_type !== selectedBillingType) return false;
      if (selectedStatus !== "ALL" && plan.status !== selectedStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = plan.name.toLowerCase().includes(q);
        const matchClient = plan.client?.name?.toLowerCase().includes(q);
        const matchProj = plan.project?.name?.toLowerCase().includes(q);
        const matchDesc = plan.description?.toLowerCase().includes(q);
        if (!matchName && !matchClient && !matchProj && !matchDesc) return false;
      }

      return true;
    });
  }, [initialPlans, selectedClientId, selectedProjectId, selectedBillingType, selectedStatus, searchQuery]);

  // Filter transactions
  const displayedPayments = React.useMemo(() => {
    return initialPayments.filter((pay) => {
      if (selectedClientId !== "ALL" && pay.client_id !== selectedClientId) return false;
      if (selectedProjectId !== "ALL" && pay.project_id !== selectedProjectId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchClient = pay.client?.name?.toLowerCase().includes(q);
        const matchProj = pay.project?.name?.toLowerCase().includes(q);
        const matchRef = pay.transaction_reference?.toLowerCase().includes(q);
        const matchItem = pay.schedule_item?.title?.toLowerCase().includes(q);
        if (!matchClient && !matchProj && !matchRef && !matchItem) return false;
      }

      return true;
    });
  }, [initialPayments, selectedClientId, selectedProjectId, searchQuery]);

  return (
    <div className="space-y-8">
      {/* 1. Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <p className="text-[11px] text-muted-foreground">Total pending receivables</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
              Collected Total
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-emerald-400 font-mono">
              {formatCurrency(metrics.collected, metrics.currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Verified receipts to date</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
              Overdue
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-red-400 font-mono">
              {formatCurrency(metrics.overdue, metrics.currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Past due date receivables</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
              Upcoming Due
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-blue-400 font-mono">
              {formatCurrency(metrics.upcoming, metrics.currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Scheduled future payments</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Top Action Bar & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-2 border-b border-border/40">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search plans, clients, projects, UTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Action Buttons & Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedClientId}
            onChange={(e) => {
              setSelectedClientId(e.target.value);
              setSelectedProjectId("ALL");
            }}
            className="h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Projects</option>
            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <RecordPaymentDialog
            clients={clients}
            projects={projects}
            plans={initialPlans}
          />

          <CreateBillingPlanDialog
            clients={clients}
            projects={projects}
            milestones={milestones}
          />
        </div>
      </div>

      {/* 3. Section Tabs */}
      <div className="flex items-center gap-1 border-b border-border/60 pb-px">
        <button
          type="button"
          onClick={() => setTab("PLANS")}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            tab === "PLANS"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Billing Plans ({displayedPlans.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("TRANSACTIONS")}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            tab === "TRANSACTIONS"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Payment Transactions ({displayedPayments.length})
        </button>
      </div>

      {/* 4. Tab 1: Billing Plans Directory */}
      {tab === "PLANS" && (
        <div className="space-y-4">
          {displayedPlans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                <div className="rounded-full bg-secondary/60 p-3.5 text-muted-foreground border border-border/40">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-medium text-foreground">No billing plans found</h3>
                  <p className="text-xs text-muted-foreground">
                    Create a new billing plan for an agency engagement to track scheduled receivables.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 bg-secondary/30 text-muted-foreground uppercase font-mono tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-semibold">Client & Project</th>
                      <th className="py-3 px-4 font-semibold">Billing Plan</th>
                      <th className="py-3 px-4 font-semibold">Type</th>
                      <th className="py-3 px-4 font-semibold text-right">Total Value</th>
                      <th className="py-3 px-4 font-semibold text-right">Outstanding</th>
                      <th className="py-3 px-4 font-semibold">Next Due</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {displayedPlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-secondary/15 transition-colors">
                        <td className="py-3 px-4 font-sans">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground block truncate">
                              {plan.client?.name || "Client"}
                            </span>
                            {plan.project ? (
                              <span className="text-[11px] text-muted-foreground block truncate">
                                {plan.project.name}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/60 block">
                                General Account
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-sans max-w-xs">
                          <span className="font-medium text-foreground block truncate">
                            {plan.name}
                          </span>
                          {plan.description && (
                            <span className="text-[11px] text-muted-foreground block truncate">
                              {plan.description}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <BillingTypeBadge type={plan.billing_type} />
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-foreground">
                          {formatCurrency(plan.total_contract_value, plan.currency)}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {(plan.total_outstanding || 0) > 0 ? (
                            <span className="text-amber-400 font-semibold">
                              {formatCurrency(plan.total_outstanding || 0, plan.currency)}
                            </span>
                          ) : (
                            <span className="text-emerald-400">Paid in Full</span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-sans">
                          {plan.next_due_date ? (
                            <div className="space-y-0.5 font-mono text-[11px]">
                              <span className="text-foreground block font-medium">
                                {formatPaymentDate(plan.next_due_date)}
                              </span>
                              {plan.next_due_amount && (
                                <span className="text-muted-foreground block">
                                  {formatCurrency(plan.next_due_amount, plan.currency)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">None</span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <BillingStatusBadge status={plan.status} />
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setInspectingPlan(plan)}
                              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="View schedule details"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              <span>Details</span>
                            </Button>

                            {plan.status === "ACTIVE" && (plan.total_outstanding || 0) > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRecordingForPlan(plan)}
                                className="text-xs h-7 px-2.5 gap-1 cursor-pointer hover:text-emerald-400 hover:border-emerald-800/60"
                              >
                                <ArrowDownRight className="h-3 w-3 text-emerald-400" />
                                <span>Record</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Payment Transactions History */}
      {tab === "TRANSACTIONS" && (
        <div className="space-y-4">
          {displayedPayments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-12 text-center text-xs text-muted-foreground">
              No payment transactions recorded yet.
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 bg-secondary/30 text-muted-foreground uppercase font-mono tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-semibold">Payment Date</th>
                      <th className="py-3 px-4 font-semibold">Client & Project</th>
                      <th className="py-3 px-4 font-semibold">Schedule Item</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount</th>
                      <th className="py-3 px-4 font-semibold">Method</th>
                      <th className="py-3 px-4 font-semibold">UTR / Reference</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {displayedPayments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-secondary/15 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-foreground">
                          {formatPaymentDate(pay.paid_at)}
                        </td>

                        <td className="py-3 px-4 font-sans">
                          <span className="font-semibold text-foreground block truncate">
                            {pay.client?.name || "Client"}
                          </span>
                          {pay.project && (
                            <span className="text-[11px] text-muted-foreground block truncate">
                              {pay.project.name}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-sans max-w-xs truncate text-muted-foreground">
                          {pay.schedule_item?.id ? (
                            <a
                              href={`/hq/payments/${pay.schedule_item.id}`}
                              className="hover:text-primary hover:underline"
                            >
                              {pay.schedule_item.title}
                            </a>
                          ) : (
                            pay.schedule_item?.title || "General Payment"
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-emerald-400">
                          {formatCurrency(pay.amount, pay.currency)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-sans text-muted-foreground">
                          {pay.method === "BANK_TRANSFER" ? "Bank Transfer" : "Razorpay"}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-foreground font-mono">
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
      )}

      {/* Plan Details Modal */}
      {inspectingPlan && (
        <PlanDetailsModal
          plan={inspectingPlan}
          open={Boolean(inspectingPlan)}
          onOpenChange={(open) => {
            if (!open) setInspectingPlan(null);
          }}
          onRecordPayment={(plan) => setRecordingForPlan(plan)}
        />
      )}

      {/* Record Payment Dialog (Triggered from plan row) */}
      {recordingForPlan && (
        <RecordPaymentDialog
          clients={clients}
          projects={projects}
          plans={initialPlans}
          defaultPlan={recordingForPlan}
          open={Boolean(recordingForPlan)}
          onOpenChange={(open) => {
            if (!open) setRecordingForPlan(null);
          }}
        />
      )}
    </div>
  );
}
