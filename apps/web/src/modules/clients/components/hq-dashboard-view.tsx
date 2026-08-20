"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  FolderKanban,
  CreditCard,
  Video,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Plus,
  Building2,
  FileCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectStatusBadge } from "@/modules/projects/components/project-status-badge";
import { ServiceTypeBadge } from "@/modules/projects/components/service-type-badge";
import { ProjectProgressBar } from "@/modules/projects/components/project-progress-bar";
import { ClientStatusBadge } from "@/modules/clients/components/client-status-badge";
import type { ClientSnapshotItem } from "@/modules/clients/data";
import type { ProjectWithNextStep } from "@/modules/projects/types";
import type { MeetingWithRelations } from "@/modules/meetings/types";
import type { PaymentOverviewMetrics, OverdueScheduleItem } from "@/modules/payments/types";
import type { ClientRequestWithRelations, RequestStats } from "@/modules/requests/types";
import type { ClientStats } from "@/modules/clients/types";
import type { ProjectStats } from "@/modules/projects/types";
import type { DeliverableWithMilestone } from "@/modules/deliverables/types";

export interface HqAttentionItem {
  id: string;
  type: "OVERDUE_PAYMENT" | "DELIVERABLE_REVIEW" | "REQUEST" | "PROJECT_RISK" | "MEETING";
  title: string;
  subtitle: string;
  actionLabel: string;
  href: string;
  isUrgent?: boolean;
}

export interface HqActivityEvent {
  id: string;
  category: "PAYMENT" | "DELIVERABLE" | "MILESTONE" | "CLIENT" | "REQUEST" | "MEETING";
  title: string;
  description?: string;
  timestamp: string;
}

interface HqDashboardViewProps {
  clientStats: ClientStats;
  projectStats: ProjectStats;
  paymentMetrics: PaymentOverviewMetrics;
  requestStats: RequestStats;
  projects: ProjectWithNextStep[];
  upcomingMeetings: MeetingWithRelations[];
  clientSnapshots: ClientSnapshotItem[];
  pendingReviewDeliverables: Array<DeliverableWithMilestone & { project?: { id: string; name: string } }>;
  overduePayments: OverdueScheduleItem[];
  activeRequests: ClientRequestWithRelations[];
  recentActivities: HqActivityEvent[];
  nextCollectionItem?: {
    amount: number;
    currency: string;
    title: string;
    clientName?: string;
    projectName?: string;
    dueDate: string | null;
  } | null;
}

export function HqDashboardView({
  clientStats,
  projectStats,
  paymentMetrics,
  requestStats,
  projects,
  upcomingMeetings,
  clientSnapshots,
  pendingReviewDeliverables,
  overduePayments,
  activeRequests,
  recentActivities,
  nextCollectionItem,
}: HqDashboardViewProps) {
  function formatDate(iso: string | null) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  function formatTime(iso: string | null) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  // Build the list of Attention Items for HQ
  const attentionItems = React.useMemo(() => {
    const items: HqAttentionItem[] = [];

    // 1. Overdue payments
    for (const overdue of overduePayments) {
      items.push({
        id: `overdue-${overdue.id}`,
        type: "OVERDUE_PAYMENT",
        title: `Payment overdue: ₹${Number(overdue.amount).toLocaleString("en-IN")}`,
        subtitle: `${overdue.client.name}${overdue.project?.name ? ` · ${overdue.project.name}` : ""} · Due ${formatDate(overdue.due_date)}`,
        actionLabel: "View Payment",
        href: "/hq/payments",
        isUrgent: true,
      });
    }

    // 2. Deliverables awaiting review
    for (const deliv of pendingReviewDeliverables) {
      items.push({
        id: `deliv-${deliv.id}`,
        type: "DELIVERABLE_REVIEW",
        title: `Deliverable ready for review: "${deliv.title}"`,
        subtitle: deliv.project?.name ? `Project: ${deliv.project.name}` : "Client deliverable awaiting review",
        actionLabel: "View Deliverable",
        href: deliv.project_id ? `/hq/projects/${deliv.project_id}` : "/hq/projects",
        isUrgent: false,
      });
    }

    // 3. Requests requiring admin response
    const unrepliedRequests = activeRequests.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS");
    for (const req of unrepliedRequests.slice(0, 3)) {
      items.push({
        id: `req-${req.id}`,
        type: "REQUEST",
        title: `Request requires response: ${req.reference_number || "REQ"}: "${req.title}"`,
        subtitle: `${req.client?.name || "Client inquiry"} · Priority: ${req.priority}`,
        actionLabel: "View Request",
        href: `/hq/requests/${req.id}`,
        isUrgent: req.priority === "URGENT" || req.priority === "HIGH",
      });
    }

    // 4. Projects at risk / on hold
    const atRiskProjects = projects.filter((p) => p.status === "ON_HOLD" || p.status === "IN_REVIEW");
    for (const p of atRiskProjects.slice(0, 2)) {
      items.push({
        id: `proj-${p.id}`,
        type: "PROJECT_RISK",
        title: `Project status: ${p.name} is ${p.status.replace(/_/g, " ")}`,
        subtitle: `${p.client?.name || "Client project"} · ${p.progress}% completed`,
        actionLabel: "View Project",
        href: `/hq/projects/${p.id}`,
        isUrgent: false,
      });
    }

    return items;
  }, [overduePayments, pendingReviewDeliverables, activeRequests, projects]);

  // SVG Donut Calculations for Revenue Collections
  const totalFinancialVolume =
    paymentMetrics.collected + paymentMetrics.outstanding;
  const collectionPercentage =
    totalFinancialVolume > 0
      ? Math.min(100, Math.round((paymentMetrics.collected / totalFinancialVolume) * 100))
      : 0;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (collectionPercentage / 100) * circumference;

  return (
    <div className="space-y-8 sm:space-y-10 max-w-7xl mx-auto pb-8">
      {/* 1. TOP OPERATIONAL SUMMARY (5-Card Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* CARD 1: ACTIVE CLIENTS */}
        <Link href="/hq/clients" className="block group">
          <div className="p-5 rounded-2xl border border-border/70 bg-card flex flex-col justify-between space-y-3 shadow-sm hover:border-border transition-all h-full min-h-[114px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Active Clients
              </span>
              <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight block">
                {clientStats.active}
              </span>
              <p className="text-xs text-muted-foreground truncate">
                {clientStats.total} total registered
              </p>
            </div>
          </div>
        </Link>

        {/* CARD 2: ACTIVE PROJECTS */}
        <Link href="/hq/projects" className="block group">
          <div className="p-5 rounded-2xl border border-border/70 bg-card flex flex-col justify-between space-y-3 shadow-sm hover:border-border transition-all h-full min-h-[114px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Active Projects
              </span>
              <FolderKanban className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight block">
                {projectStats.active}
              </span>
              <p className="text-xs text-muted-foreground truncate">
                {projectStats.total} total engagements
              </p>
            </div>
          </div>
        </Link>

        {/* CARD 3: OUTSTANDING PAYMENTS */}
        <Link href="/hq/payments" className="block group">
          <div className="p-5 rounded-2xl border border-border/70 bg-card flex flex-col justify-between space-y-3 shadow-sm hover:border-border transition-all h-full min-h-[114px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Outstanding
              </span>
              <div
                className={`h-2 w-2 rounded-full ${
                  paymentMetrics.outstanding > 0
                    ? "bg-amber-400"
                    : "bg-emerald-400"
                }`}
              />
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight block">
                ₹{paymentMetrics.outstanding.toLocaleString("en-IN")}
              </span>
              <p className="text-xs text-muted-foreground truncate">
                {paymentMetrics.overdue > 0
                  ? `₹${paymentMetrics.overdue.toLocaleString("en-IN")} overdue`
                  : "Pending settlement"}
              </p>
            </div>
          </div>
        </Link>

        {/* CARD 4: DUE THIS MONTH */}
        <Link href="/hq/payments" className="block group">
          <div className="p-5 rounded-2xl border border-border/70 bg-card flex flex-col justify-between space-y-3 shadow-sm hover:border-border transition-all h-full min-h-[114px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Due This Month
              </span>
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight block">
                ₹{paymentMetrics.dueThisMonth.toLocaleString("en-IN")}
              </span>
              <p className="text-xs text-muted-foreground truncate">
                ₹{paymentMetrics.collected.toLocaleString("en-IN")} collected total
              </p>
            </div>
          </div>
        </Link>

        {/* CARD 5: OPEN REQUESTS */}
        <Link href="/hq/requests" className="block group">
          <div className="p-5 rounded-2xl border border-border/70 bg-card flex flex-col justify-between space-y-3 shadow-sm hover:border-border transition-all h-full min-h-[114px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Open Requests
              </span>
              <div
                className={`h-2 w-2 rounded-full ${
                  requestStats.open > 0
                    ? "bg-amber-400"
                    : "bg-emerald-400"
                }`}
              />
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight block">
                {requestStats.open + requestStats.inProgress}
              </span>
              <p className="text-xs text-muted-foreground truncate">
                {requestStats.waitingForClient > 0
                  ? `${requestStats.waitingForClient} waiting on client`
                  : requestStats.open > 0
                  ? `${requestStats.open} pending response`
                  : "All inquiries handled"}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* 2. NEEDS ATTENTION CENTER */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Needs Attention
          </h2>
          {attentionItems.length > 0 && (
            <Badge variant="outline" className="text-[10px] font-mono border-amber-600/60 bg-amber-950/40 text-amber-300">
              {attentionItems.length} Action{attentionItems.length === 1 ? "" : "s"} Required
            </Badge>
          )}
        </div>

        {attentionItems.length === 0 ? (
          <div className="p-4 sm:p-4.5 px-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-foreground">
                All clear. No urgent operational actions require your attention right now.
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400/80 hidden sm:inline-block">
              Operational Status: Nominal
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 sm:p-4.5 px-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  item.isUrgent
                    ? "bg-destructive/10 border-destructive/40 shadow-sm"
                    : "bg-card border-border/80 hover:border-primary/50 shadow-sm"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                      item.isUrgent
                        ? "bg-destructive/20 text-destructive border-destructive/40"
                        : item.type === "DELIVERABLE_REVIEW"
                        ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                        : item.type === "OVERDUE_PAYMENT"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-primary/15 text-primary border-primary/30"
                    }`}
                  >
                    {item.isUrgent ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : item.type === "DELIVERABLE_REVIEW" ? (
                      <FileCheck className="h-4 w-4" />
                    ) : item.type === "OVERDUE_PAYMENT" ? (
                      <CreditCard className="h-4 w-4" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end shrink-0">
                  <Link href={item.href}>
                    <Button
                      size="sm"
                      className={`h-8 text-xs px-3.5 gap-1.5 shadow-sm font-semibold cursor-pointer ${
                        item.isUrgent
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. MAIN OPERATIONS (12-Column Grid: Projects 7 cols + Revenue 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7">
        {/* PROJECTS OVERVIEW / ACTIVE DELIVERY (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div className="space-y-0.5">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Active Delivery
              </h2>
              <p className="text-xs text-muted-foreground">
                Current delivery status across active engagements.
              </p>
            </div>
            <Link
              href="/hq/projects"
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
            >
              <span>View all projects</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-7 space-y-5 shadow-sm">
            {projects.length === 0 ? (
              <div className="py-8 text-center space-y-2.5">
                <div className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground mx-auto">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 max-w-sm mx-auto">
                  <p className="text-xs font-semibold text-foreground">No active projects yet</p>
                  <p className="text-[11px] text-muted-foreground">Projects created for clients will appear here.</p>
                </div>
                <div className="pt-1.5">
                  <Link href="/hq/projects">
                    <Button size="sm" variant="outline" className="h-7 text-xs px-3 gap-1.5 border-border/70 hover:bg-secondary">
                      <Plus className="h-3 w-3" />
                      <span>New Project</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="divide-y divide-border/40">
                  {projects.slice(0, 2).map((project) => (
                    <div key={project.id} className="py-4 first:pt-0 last:pb-0 space-y-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/hq/projects/${project.id}`}
                              className="text-base font-bold tracking-tight text-foreground hover:text-primary transition-colors truncate"
                            >
                              {project.name}
                            </Link>
                            <ProjectStatusBadge status={project.status} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {project.client?.name || "Client Account"} ·{" "}
                            <span className="font-medium text-foreground/80">
                              {project.service_type.replace(/_/g, " ")}
                            </span>
                          </p>
                        </div>

                        <Link href={`/hq/projects/${project.id}`} className="shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-3 gap-1.5 border-border/80 hover:bg-secondary cursor-pointer"
                          >
                            <span>View Project</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>

                      {/* Progress Bar & Milestone Counter */}
                      <div className="space-y-2 pt-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground font-mono">
                            {project.progress}% complete
                          </span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {project.milestone_count === 0
                              ? "No milestones"
                              : `${project.completed_milestone_count} / ${project.milestone_count} milestones`}
                          </span>
                        </div>

                        <ProjectProgressBar
                          progress={project.progress}
                          milestoneCount={project.milestone_count}
                          completedMilestoneCount={project.completed_milestone_count}
                        />
                      </div>

                      {/* Current Phase & Target Date Footer */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1 text-muted-foreground">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold px-2 py-0.5 rounded bg-secondary/80 border border-border/50 shrink-0">
                            Current Phase
                          </span>
                          <span className="text-foreground/90 font-medium truncate">
                            {project.next_milestone
                              ? project.next_milestone.name
                              : project.next_step}
                          </span>
                        </div>

                        {project.target_date && (
                          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground shrink-0">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                            <span>Target: {formatDate(project.target_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtle indicator when more than 2 projects exist */}
                {projects.length > 2 && (
                  <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono text-[11px]">
                      Showing 2 of {projects.length} projects
                    </span>
                    <Link
                      href="/hq/projects"
                      className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span>View all projects</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* REVENUE & COLLECTIONS (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="space-y-0.5 px-0.5">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Revenue & Collections
            </h2>
            <p className="text-xs text-muted-foreground">
              Current billing and collection status.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-7 space-y-5 shadow-sm flex flex-col justify-between">
            {/* SVG Donut Chart */}
            <div className="flex items-center justify-center pt-1">
              <div className="relative flex items-center justify-center">
                <svg className="h-28 w-28 -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="stroke-secondary"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="stroke-primary transition-all duration-700 ease-out"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold font-mono text-foreground tracking-tight">
                    {collectionPercentage}%
                  </span>
                  <span className="text-[9px] uppercase font-mono tracking-wider text-muted-foreground">
                    Collected
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div className="w-full space-y-2.5 pt-2 border-t border-border/40 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                  <span>Collected</span>
                </span>
                <span className="font-mono font-bold text-foreground">
                  ₹{paymentMetrics.collected.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                  <span>Outstanding</span>
                </span>
                <span className="font-mono font-bold text-foreground">
                  ₹{paymentMetrics.outstanding.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                  <span>Overdue</span>
                </span>
                <span className="font-mono font-bold text-destructive">
                  ₹{paymentMetrics.overdue.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
                  <span>Upcoming</span>
                </span>
                <span className="font-mono font-medium text-foreground">
                  ₹{paymentMetrics.upcoming.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Next Collection Box */}
            {nextCollectionItem && (
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50 space-y-1.5 text-xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block font-semibold">
                  Next Collection
                </span>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="font-mono font-bold text-foreground">
                    ₹{nextCollectionItem.amount.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Due {formatDate(nextCollectionItem.dueDate)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {nextCollectionItem.clientName}{nextCollectionItem.projectName ? ` · ${nextCollectionItem.projectName}` : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. SECONDARY OPERATIONS (12-Column Grid: Meetings 5 cols + Activity 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7">
        {/* UPCOMING MEETINGS (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div className="space-y-0.5">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Upcoming Meetings
              </h2>
              <p className="text-xs text-muted-foreground">
                Scheduled client syncs and briefings.
              </p>
            </div>
            <Link
              href="/hq/meetings"
              className="text-xs text-muted-foreground hover:text-foreground font-medium"
            >
              View calendar →
            </Link>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
            {upcomingMeetings.length === 0 ? (
              <div className="py-6 text-center space-y-2.5">
                <div className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground mx-auto">
                  <Video className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-foreground">No upcoming meetings scheduled</p>
                  <p className="text-[11px] text-muted-foreground">Your calendar is clear.</p>
                </div>
                <div className="pt-1.5">
                  <Link href="/hq/meetings">
                    <Button size="sm" variant="outline" className="h-7 text-xs px-3 gap-1.5 border-border/70 hover:bg-secondary">
                      <Plus className="h-3 w-3" />
                      <span>Schedule Meeting</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {upcomingMeetings.slice(0, 3).map((meeting) => (
                  <div
                    key={meeting.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/60 shrink-0">
                        <Video className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-semibold text-foreground block truncate">
                          {meeting.title}
                        </span>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">
                          {meeting.client?.name}{meeting.project?.name ? ` · ${meeting.project.name}` : ""} · {formatDate(meeting.starts_at)} at {formatTime(meeting.starts_at)}
                        </p>
                      </div>
                    </div>

                    <Link href="/hq/meetings">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[11px] px-2.5 border-border/80 hover:bg-secondary cursor-pointer shrink-0"
                      >
                        <span>Open</span>
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RECENT ACTIVITY (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="space-y-0.5 px-0.5">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Recent Activity
            </h2>
            <p className="text-xs text-muted-foreground">
              Latest updates across operations.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
            {recentActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Activity will appear here as team operations progress.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {recentActivities.slice(0, 4).map((act) => {
                  const Icon =
                    act.category === "PAYMENT"
                      ? CreditCard
                      : act.category === "DELIVERABLE"
                      ? FileCheck
                      : act.category === "CLIENT"
                      ? Users
                      : act.category === "MEETING"
                      ? Video
                      : MessageSquare;

                  return (
                    <div
                      key={act.id}
                      className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/60 shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {act.title}
                          </p>
                          {act.description && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {act.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                        {act.timestamp}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. CLIENT SNAPSHOT & QUICK ACTIONS (12-Column Grid: Clients 5 cols + Actions 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7">
        {/* CLIENTS SNAPSHOT (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div className="space-y-0.5">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Clients Snapshot
              </h2>
              <p className="text-xs text-muted-foreground">
                Active client accounts & billing standing.
              </p>
            </div>
            <Link
              href="/hq/clients"
              className="text-xs text-muted-foreground hover:text-foreground font-medium"
            >
              View directory →
            </Link>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
            {clientSnapshots.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No clients registered yet.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {clientSnapshots.map((client) => (
                  <div
                    key={client.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/60 shrink-0">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/hq/clients/${client.id}`}
                            className="font-semibold text-foreground hover:text-primary transition-colors truncate"
                          >
                            {client.name}
                          </Link>
                          <ClientStatusBadge status={client.status} />
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {client.active_project_count} active {client.active_project_count === 1 ? "project" : "projects"}{" "}
                          · {client.outstanding_balance > 0 ? (
                            <span className="text-amber-400 font-mono">₹{client.outstanding_balance.toLocaleString("en-IN")} outstanding</span>
                          ) : (
                            <span className="text-emerald-400 font-mono">₹0 outstanding</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <Link href={`/hq/clients/${client.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[11px] px-2.5 border-border/80 hover:bg-secondary cursor-pointer shrink-0"
                      >
                        <span>View</span>
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="space-y-0.5 px-0.5">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Quick Actions
            </h2>
            <p className="text-xs text-muted-foreground">
              Direct access to create and manage operational items.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/hq/clients" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10 text-xs font-medium justify-between border-border/80 hover:bg-secondary cursor-pointer px-3.5"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>New Client</span>
                  </span>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </Link>

              <Link href="/hq/projects" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10 text-xs font-medium justify-between border-border/80 hover:bg-secondary cursor-pointer px-3.5"
                >
                  <span className="flex items-center gap-2">
                    <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>New Project</span>
                  </span>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </Link>

              <Link href="/hq/meetings" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10 text-xs font-medium justify-between border-border/80 hover:bg-secondary cursor-pointer px-3.5"
                >
                  <span className="flex items-center gap-2">
                    <Video className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Schedule Meeting</span>
                  </span>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </Link>

              <Link href="/hq/requests" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10 text-xs font-medium justify-between border-border/80 hover:bg-secondary cursor-pointer px-3.5"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>View Requests</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>

              <Link href="/hq/team" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10 text-xs font-medium justify-between border-border/80 hover:bg-secondary cursor-pointer px-3.5"
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Team Directory</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>

              <Link href="/hq/payments" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10 text-xs font-medium justify-between border-border/80 hover:bg-secondary cursor-pointer px-3.5"
                >
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Record Payment</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
