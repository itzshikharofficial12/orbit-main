"use client";

import * as React from "react";
import Link from "next/link";
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
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  FileText,
  Download,
  Filter,
  RefreshCw,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BillingTypeBadge } from "./billing-type-badge";
import { BillingStatusBadge } from "./billing-status-badge";
import { CreateBillingPlanDialog } from "./create-billing-plan-dialog";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { PlanDetailsModal } from "./plan-details-modal";
import { ReviewBankTransferModal } from "./review-bank-transfer-modal";
import { formatCurrency, formatPaymentDate } from "../utils";
import type {
  BillingPlanWithRelations,
  PaymentWithRelations,
  PaymentOverviewMetrics,
  PendingBankTransfer,
  OverdueScheduleItem,
  UpcomingScheduleItem,
  BillingType,
  BillingPlanStatus,
} from "../types";
import type { Client, Project, Milestone } from "@/lib/supabase/types";

interface AdminPaymentsDirectoryProps {
  initialPlans: BillingPlanWithRelations[];
  initialPayments: PaymentWithRelations[];
  metrics: PaymentOverviewMetrics;
  pendingTransfers?: PendingBankTransfer[];
  overdueItems?: OverdueScheduleItem[];
  upcomingItems?: UpcomingScheduleItem[];
  clients: Client[];
  projects: Project[];
  milestones?: Milestone[];
}

export function AdminPaymentsDirectory({
  initialPlans,
  initialPayments,
  metrics,
  pendingTransfers = [],
  overdueItems = [],
  upcomingItems = [],
  clients,
  projects,
  milestones = [],
}: AdminPaymentsDirectoryProps) {
  const [tab, setTab] = React.useState<"PLANS" | "UPCOMING" | "OVERDUE" | "PENDING" | "TRANSACTIONS">("PLANS");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedClientId, setSelectedClientId] = React.useState("ALL");
  const [selectedProjectId, setSelectedProjectId] = React.useState("ALL");
  const [selectedBillingType, setSelectedBillingType] = React.useState<BillingType | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState<BillingPlanStatus | "ALL">("ALL");

  // Modals state
  const [inspectingPlan, setInspectingPlan] = React.useState<BillingPlanWithRelations | null>(null);
  const [recordingForPlan, setRecordingForPlan] = React.useState<BillingPlanWithRelations | null>(null);
  const [reviewingTransfer, setReviewingTransfer] = React.useState<PendingBankTransfer | null>(null);

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

  // Filter upcoming items
  const displayedUpcoming = React.useMemo(() => {
    return upcomingItems.filter((item) => {
      if (selectedClientId !== "ALL" && item.client.id !== selectedClientId) return false;
      if (selectedProjectId !== "ALL" && item.project?.id !== selectedProjectId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchClient = item.client.name.toLowerCase().includes(q);
        const matchProj = item.project?.name?.toLowerCase().includes(q);
        const matchPlan = item.billing_plan.name.toLowerCase().includes(q);
        if (!matchTitle && !matchClient && !matchProj && !matchPlan) return false;
      }

      return true;
    });
  }, [upcomingItems, selectedClientId, selectedProjectId, searchQuery]);

  // Filter overdue items
  const displayedOverdue = React.useMemo(() => {
    return overdueItems.filter((item) => {
      if (selectedClientId !== "ALL" && item.client.id !== selectedClientId) return false;
      if (selectedProjectId !== "ALL" && item.project?.id !== selectedProjectId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchClient = item.client.name.toLowerCase().includes(q);
        const matchProj = item.project?.name?.toLowerCase().includes(q);
        const matchPlan = item.billing_plan.name.toLowerCase().includes(q);
        if (!matchTitle && !matchClient && !matchProj && !matchPlan) return false;
      }

      return true;
    });
  }, [overdueItems, selectedClientId, selectedProjectId, searchQuery]);

  // Filter pending transfers
  const displayedPending = React.useMemo(() => {
    return pendingTransfers.filter((transfer) => {
      if (selectedClientId !== "ALL" && transfer.client.id !== selectedClientId) return false;
      if (selectedProjectId !== "ALL" && transfer.project?.id !== selectedProjectId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchClient = transfer.client.name.toLowerCase().includes(q);
        const matchProj = transfer.project?.name?.toLowerCase().includes(q);
        const matchRef = transfer.transaction_reference?.toLowerCase().includes(q);
        const matchItem = transfer.schedule_item?.title?.toLowerCase().includes(q);
        if (!matchClient && !matchProj && !matchRef && !matchItem) return false;
      }

      return true;
    });
  }, [pendingTransfers, selectedClientId, selectedProjectId, searchQuery]);

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

  const hasAttentionItems = pendingTransfers.length > 0 || overdueItems.length > 0;

  return (
    <div className="space-y-6">
      {/* 1. Quick Actions */}
      <div className="flex items-center justify-end gap-2">
          <RecordPaymentDialog
            plans={initialPlans}
            clients={clients}
            projects={projects}
            preselectedPlan={recordingForPlan || undefined}
            open={!!recordingForPlan}
            onOpenChange={(open) => !open && setRecordingForPlan(null)}
            trigger={
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" />
                <span>Record Manual Payment</span>
              </Button>
            }
          />

          <CreateBillingPlanDialog
            clients={clients}
            projects={projects}
            milestones={milestones}
            trigger={
              <Button size="sm" className="h-8 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                <span>New Billing Plan</span>
              </Button>
            }
          />
        </div>

      {/* 2. Financial Summary Cards (6 Top Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-card/60 border-border/80 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Total Contract Value
          </span>
          <span className="text-base lg:text-lg font-bold font-mono text-foreground block">
            {formatCurrency(metrics.totalContractValue, metrics.currency)}
          </span>
          <span className="text-[10px] text-muted-foreground block">All active plans</span>
        </Card>

        <Card className="p-3.5 bg-card/60 border-border/80 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 block">
            Total Collected
          </span>
          <span className="text-base lg:text-lg font-bold font-mono text-emerald-400 block">
            {formatCurrency(metrics.collected, metrics.currency)}
          </span>
          <span className="text-[10px] text-muted-foreground block">Verified revenue</span>
        </Card>

        <Card className="p-3.5 bg-card/60 border-border/80 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Outstanding
          </span>
          <span className="text-base lg:text-lg font-bold font-mono text-foreground block">
            {formatCurrency(metrics.outstanding, metrics.currency)}
          </span>
          <span className="text-[10px] text-muted-foreground block">Pending settlement</span>
        </Card>

        <Card className={`p-3.5 bg-card/60 space-y-1 ${metrics.overdue > 0 ? "border-rose-900/60 bg-rose-950/10" : "border-border/80"}`}>
          <span className={`text-[10px] font-semibold uppercase tracking-wider block ${metrics.overdue > 0 ? "text-rose-400" : "text-muted-foreground"}`}>
            Overdue
          </span>
          <span className={`text-base lg:text-lg font-bold font-mono block ${metrics.overdue > 0 ? "text-rose-400" : "text-foreground"}`}>
            {formatCurrency(metrics.overdue, metrics.currency)}
          </span>
          <span className="text-[10px] text-muted-foreground block">
            {overdueItems.length} overdue {overdueItems.length === 1 ? "invoice" : "invoices"}
          </span>
        </Card>

        <Card className="p-3.5 bg-card/60 border-border/80 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Due This Month
          </span>
          <span className="text-base lg:text-lg font-bold font-mono text-foreground block">
            {formatCurrency(metrics.dueThisMonth, metrics.currency)}
          </span>
          <span className="text-[10px] text-muted-foreground block">Current billing cycle</span>
        </Card>

        <Card className="p-3.5 bg-card/60 border-border/80 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Upcoming
          </span>
          <span className="text-base lg:text-lg font-bold font-mono text-foreground block">
            {formatCurrency(metrics.upcoming, metrics.currency)}
          </span>
          <span className="text-[10px] text-muted-foreground block">Future milestones</span>
        </Card>
      </div>

      {/* 3. Needs Attention Section */}
      {hasAttentionItems && (
        <div className="space-y-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Needs Attention
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {pendingTransfers.length} pending verification • {overdueItems.length} overdue
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Pending Bank Transfers Triage */}
            {pendingTransfers.map((transfer) => (
              <div
                key={transfer.id}
                className="flex items-center justify-between p-3 rounded-lg bg-card/80 border border-border/80 gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {transfer.client.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                      Bank Wire
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span>UTR: <strong className="font-mono text-foreground/90">{transfer.transaction_reference || "N/A"}</strong></span>
                    <span>•</span>
                    <span className="font-mono text-foreground font-semibold">
                      {formatCurrency(transfer.amount, transfer.currency)}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => setReviewingTransfer(transfer)}
                  className="h-7 text-xs px-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 shrink-0"
                >
                  Review
                </Button>
              </div>
            ))}

            {/* Overdue Items Triage */}
            {overdueItems.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-card/80 border border-rose-900/40 gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {item.client.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-800/40 font-mono font-medium">
                      {item.daysOverdue} {item.daysOverdue === 1 ? "day" : "days"} overdue
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span className="truncate">{item.title}</span>
                    <span>•</span>
                    <span className="font-mono text-rose-400 font-semibold">
                      {formatCurrency(item.remainingAmount, item.currency)}
                    </span>
                  </div>
                </div>

                <Link href={`/hq/payments/${item.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 border-border/80 hover:bg-secondary shrink-0"
                  >
                    View Invoice
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Directory Tabs & Filter Controls */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setTab("PLANS")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === "PLANS"
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Billing Plans ({initialPlans.length})
            </button>
            <button
              onClick={() => setTab("UPCOMING")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === "UPCOMING"
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upcoming Collections ({upcomingItems.length})
            </button>
            <button
              onClick={() => setTab("OVERDUE")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === "OVERDUE"
                  ? "bg-rose-950/30 text-rose-400 font-semibold border border-rose-900/40"
                  : "text-muted-foreground hover:text-rose-400"
              }`}
            >
              Overdue ({overdueItems.length})
            </button>
            <button
              onClick={() => setTab("PENDING")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === "PENDING"
                  ? "bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20"
                  : "text-muted-foreground hover:text-amber-400"
              }`}
            >
              Pending Verification ({pendingTransfers.length})
            </button>
            <button
              onClick={() => setTab("TRANSACTIONS")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === "TRANSACTIONS"
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Transactions Ledger ({initialPayments.length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search client, project, UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* 5. Tab Content Views */}

        {/* TAB 1: BILLING PLANS */}
        {tab === "PLANS" && (
          <div className="space-y-3">
            {displayedPlans.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-border/80 bg-card/30">
                <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <h3 className="text-sm font-medium text-foreground">No billing plans found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {searchQuery ? "Try adjusting your search query." : "Establish your first commercial billing plan to schedule invoices."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {displayedPlans.map((plan) => (
                  <Card
                    key={plan.id}
                    className="p-4 bg-card/60 hover:bg-card/90 transition-colors border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{plan.name}</span>
                        <BillingTypeBadge type={plan.billing_type} />
                        <BillingStatusBadge status={plan.status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 text-foreground/80">
                          <Building2 className="h-3 w-3" />
                          <span>{plan.client?.name || "Client"}</span>
                        </span>
                        {plan.project && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <FolderKanban className="h-3 w-3" />
                              <span>{plan.project.name}</span>
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>{plan.schedule_items?.length || 0} scheduled invoices</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                      <div className="text-left md:text-right font-mono">
                        <span className="text-sm font-bold text-foreground block">
                          {formatCurrency(plan.total_contract_value, plan.currency)}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Collected: {formatCurrency(plan.total_collected || 0, plan.currency)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInspectingPlan(plan)}
                          className="h-7 text-xs px-2.5"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          <span>Schedule</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setRecordingForPlan(plan)}
                          className="h-7 text-xs px-2.5"
                        >
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                          <span>Record</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: UPCOMING COLLECTIONS */}
        {tab === "UPCOMING" && (
          <div className="space-y-3">
            {displayedUpcoming.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-border/80 bg-card/30">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <h3 className="text-sm font-medium text-foreground">No upcoming collections</h3>
                <p className="text-xs text-muted-foreground mt-1">All scheduled payments are settled or none exist.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {displayedUpcoming.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-card/60 border border-border/80 gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{item.title}</span>
                        <BillingStatusBadge status={item.status} />
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>{item.client.name}</span>
                        {item.project && (
                          <>
                            <span>•</span>
                            <span>{item.project.name}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="font-mono text-foreground/80 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {formatPaymentDate(item.due_date)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-foreground block">
                          {formatCurrency(item.remainingAmount, item.currency)}
                        </span>
                        {item.paidAmount > 0 && (
                          <span className="text-[10px] text-emerald-400 block">
                            Paid: {formatCurrency(item.paidAmount, item.currency)}
                          </span>
                        )}
                      </div>

                      <Link href={`/hq/payments/${item.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2.5">
                          View Invoice
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OVERDUE COLLECTIONS */}
        {tab === "OVERDUE" && (
          <div className="space-y-3">
            {displayedOverdue.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-border/80 bg-card/30">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-50" />
                <h3 className="text-sm font-medium text-foreground">No overdue payments</h3>
                <p className="text-xs text-muted-foreground mt-1">All due payments have been collected on schedule.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {displayedOverdue.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-card/60 border border-rose-900/50 gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{item.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-800/50">
                          {item.daysOverdue} {item.daysOverdue === 1 ? "day" : "days"} overdue
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>{item.client.name}</span>
                        {item.project && (
                          <>
                            <span>•</span>
                            <span>{item.project.name}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="font-mono text-rose-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Was Due: {formatPaymentDate(item.due_date)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-rose-400 block">
                          {formatCurrency(item.remainingAmount, item.currency)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Link href={`/hq/requests?query=${encodeURIComponent(item.client.name)}`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground">
                            <HelpCircle className="h-3 w-3" />
                            <span>Queries</span>
                          </Button>
                        </Link>
                        <Link href={`/hq/payments/${item.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5">
                            View Invoice
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PENDING BANK TRANSFERS */}
        {tab === "PENDING" && (
          <div className="space-y-3">
            {displayedPending.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-border/80 bg-card/30">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-50" />
                <h3 className="text-sm font-medium text-foreground">No pending transfers</h3>
                <p className="text-xs text-muted-foreground mt-1">No client bank transfers are currently awaiting verification.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {displayedPending.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-card/60 border border-amber-500/30 gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{transfer.client.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                          Bank Wire
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>Invoice: <strong className="text-foreground/90">{transfer.schedule_item?.title || "Payment"}</strong></span>
                        <span>•</span>
                        <span>UTR: <strong className="font-mono text-foreground">{transfer.transaction_reference || "N/A"}</strong></span>
                        <span>•</span>
                        <span>Date: {formatPaymentDate(transfer.paid_at || transfer.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-foreground block">
                          {formatCurrency(transfer.amount, transfer.currency)}
                        </span>
                        <span className="text-[10px] text-amber-400 block">Pending Admin Verification</span>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setReviewingTransfer(transfer)}
                        className="h-7 text-xs px-3 bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                      >
                        Review Transfer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: TRANSACTIONS LEDGER */}
        {tab === "TRANSACTIONS" && (
          <div className="space-y-3">
            {displayedPayments.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-border/80 bg-card/30">
                <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <h3 className="text-sm font-medium text-foreground">No payment transactions</h3>
                <p className="text-xs text-muted-foreground mt-1">Recorded payments and receipts will be cataloged here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {displayedPayments.map((pay) => (
                  <div
                    key={pay.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-card/60 border border-border/80 gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {pay.client?.name || "Client"}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                          {pay.method === "BANK_TRANSFER" ? "Bank Wire" : pay.method}
                        </span>
                        <BillingStatusBadge status={pay.status} />
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        {pay.schedule_item && <span>{pay.schedule_item.title}</span>}
                        {pay.transaction_reference && (
                          <>
                            <span>•</span>
                            <span className="font-mono">Ref: {pay.transaction_reference}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatPaymentDate(pay.paid_at || pay.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-foreground block">
                          {formatCurrency(pay.amount, pay.currency)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {pay.status === "PAID" && (
                          <a
                            href={`/api/payments/receipts/${pay.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 gap-1">
                              <Download className="h-3 w-3" />
                              <span>Receipt PDF</span>
                            </Button>
                          </a>
                        )}

                        {pay.billing_schedule_item_id && (
                          <Link href={`/hq/payments/${pay.billing_schedule_item_id}`}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground">
                              Invoice
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {inspectingPlan && (
        <PlanDetailsModal
          plan={inspectingPlan}
          open={!!inspectingPlan}
          onOpenChange={(open) => !open && setInspectingPlan(null)}
          onRecordPayment={(plan) => {
            setInspectingPlan(null);
            setRecordingForPlan(plan);
          }}
        />
      )}

      {reviewingTransfer && (
        <ReviewBankTransferModal
          transfer={reviewingTransfer}
          isOpen={!!reviewingTransfer}
          onClose={() => setReviewingTransfer(null)}
        />
      )}
    </div>
  );
}
