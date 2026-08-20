"use client";

import * as React from "react";
import Link from "next/link";
import {
  FolderKanban,
  FileCheck,
  CreditCard,
  Video,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  HelpCircle,
  Clock,
  Mail,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrbitAvatar } from "@/components/ui/orbit-avatar";
import { ProjectStatusBadge } from "@/modules/projects/components/project-status-badge";
import { ServiceTypeBadge } from "@/modules/projects/components/service-type-badge";
import { ProjectProgressBar } from "@/modules/projects/components/project-progress-bar";
import type { ProjectWithNextStep } from "@/modules/projects/types";
import type { DeliverableWithMilestone } from "@/modules/deliverables/types";
import type { Meeting } from "@/modules/meetings/types";
import type { ClientRequestWithRelations } from "@/modules/requests/types";
import type { ClientWithPm } from "../types";
import type { Profile } from "@/lib/supabase/types";

export interface UpcomingPaymentItem {
  id: string;
  amount: number;
  currency: string;
  title: string;
  projectName?: string;
  dueDate: string | null;
  isOverdue: boolean;
  daysRemaining: number;
}

export interface ActivityEvent {
  id: string;
  category: "DELIVERABLE" | "PAYMENT" | "REQUEST" | "MEETING" | "PROJECT";
  title: string;
  description?: string;
  timestamp: string;
  badge?: string;
  link?: string;
}

interface ClientHomeViewProps {
  profile: Profile;
  client: ClientWithPm | null;
  projects: ProjectWithNextStep[];
  pendingReviewDeliverables: DeliverableWithMilestone[];
  upcomingMeeting: Meeting | null;
  upcomingPayment: UpcomingPaymentItem | null;
  activeRequests: ClientRequestWithRelations[];
  recentActivities: ActivityEvent[];
}

export function ClientHomeView({
  profile,
  client,
  projects,
  pendingReviewDeliverables,
  upcomingMeeting,
  upcomingPayment,
  activeRequests,
  recentActivities,
}: ClientHomeViewProps) {
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

  // Calculate overall milestone statistics across active projects
  const milestoneStats = React.useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let planned = 0;
    let total = 0;

    for (const p of projects) {
      completed += p.completed_milestone_count || 0;
      inProgress += p.in_progress_milestone_count || 0;
      planned += p.planned_milestone_count || 0;
      total += p.milestone_count || 0;
    }

    const overallProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completed,
      inProgress,
      planned,
      total,
      overallProgress,
    };
  }, [projects]);

  // Primary active project
  const primaryProject = projects[0] || null;

  // Requests needing response
  const waitingRequests = activeRequests.filter((r) => r.status === "WAITING_FOR_CLIENT");

  // 0-Projects Empty State (Brand New Client)
  if (projects.length === 0) {
    return (
      <div className="space-y-8 max-w-5xl py-4">
        <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/60 mx-auto">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-semibold text-foreground">
              Your first project will appear here once it begins
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Once your engagement is activated by Celestia Studios, you will be able to track live milestone progress, review deliverables, manage payments, and collaborate directly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // SVG Circular Gauge calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (milestoneStats.overallProgress / 100) * circumference;

  return (
    <div className="space-y-8 max-w-7xl">
      {/* 0. PRIMARY PROJECT MANAGER HERO BANNER */}
      {client?.project_manager && (
        <div className="rounded-2xl border border-border/80 bg-linear-to-r from-card via-card to-primary/5 p-5 shadow-sm hover:border-border transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <OrbitAvatar
                  src={client.project_manager.avatar_url}
                  name={`${client.project_manager.first_name} ${client.project_manager.last_name || ""}`}
                  size="lg"
                  className="ring-1 ring-border/80 shadow-xs"
                />
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card" title="Active Project Lead" />
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    Your Assigned Project Manager
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    · Celestia Studios
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                    {client.project_manager.first_name} {client.project_manager.last_name || ""}
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({client.project_manager.email})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed hidden sm:block">
                  Direct operational lead responsible for your delivery roadmap, quality reviews, and team coordination.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
              <a href={`mailto:${client.project_manager.email}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8.5 text-xs px-3.5 gap-2 border-border/80 hover:bg-secondary cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Email {client.project_manager.first_name}</span>
                </Button>
              </a>
              <Link href="/client/requests">
                <Button
                  size="sm"
                  className="h-8.5 text-xs px-4 gap-2 font-semibold shadow-sm cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Submit Request</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP SUMMARY / ACTION CARDS (4-Card Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: NEXT PAYMENT */}
        <div className="p-4 rounded-xl border border-border/70 bg-card flex flex-col justify-between space-y-3 shadow-sm hover:border-border transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Next Payment
              </span>
              <div
                className={`h-2 w-2 rounded-full ${
                  upcomingPayment?.isOverdue
                    ? "bg-destructive animate-pulse"
                    : upcomingPayment && upcomingPayment.daysRemaining <= 5
                    ? "bg-amber-400"
                    : upcomingPayment
                    ? "bg-emerald-400"
                    : "bg-muted-foreground/40"
                }`}
              />
            </div>

            {upcomingPayment ? (
              <div className="space-y-1">
                <span className="text-2xl font-bold font-mono text-foreground block tracking-tight">
                  {upcomingPayment.currency === "INR" ? "₹" : "$"}
                  {upcomingPayment.amount.toLocaleString("en-IN")}
                </span>
                <p className="text-xs text-muted-foreground truncate font-medium">
                  {upcomingPayment.title}
                </p>
                <div className="pt-0.5">
                  {upcomingPayment.isOverdue ? (
                    <span className="text-[11px] font-mono text-destructive font-semibold">
                      Payment overdue · Due {formatDate(upcomingPayment.dueDate)}
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Due {formatDate(upcomingPayment.dueDate)}{" "}
                      {upcomingPayment.daysRemaining >= 0 &&
                        `· ${upcomingPayment.daysRemaining === 0 ? "Due today" : `${upcomingPayment.daysRemaining} days left`}`}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-2 space-y-1">
                <span className="text-2xl font-bold font-mono text-foreground block">
                  —
                </span>
                <p className="text-xs text-muted-foreground">
                  No upcoming payment
                </p>
                <span className="text-[11px] font-mono text-emerald-400 block">
                  All caught up
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border/40">
            <Link href="/client/payments">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs font-semibold justify-between px-2 text-foreground/80 hover:text-foreground hover:bg-secondary/60 cursor-pointer"
              >
                <span>{upcomingPayment ? "Pay Now" : "View Payments"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* CARD 2: AWAITING YOUR REVIEW */}
        <div className="p-4 rounded-xl border border-border/70 bg-card flex flex-col justify-between space-y-3 shadow-sm hover:border-border transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Awaiting Review
              </span>
              <div
                className={`h-2 w-2 rounded-full ${
                  pendingReviewDeliverables.length > 0
                    ? "bg-amber-400 animate-pulse"
                    : "bg-emerald-400"
                }`}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
                  {pendingReviewDeliverables.length}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {pendingReviewDeliverables.length === 1
                    ? "Deliverable"
                    : "Deliverables"}
                </span>
              </div>

              {pendingReviewDeliverables.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-foreground truncate">
                    {pendingReviewDeliverables[0].title}
                  </p>
                  <span className="text-[11px] font-mono text-amber-300 block pt-0.5">
                    Awaiting your approval
                  </span>
                </div>
              ) : (
                <div className="space-y-0.5 pt-1">
                  <p className="text-xs text-muted-foreground">
                    You&apos;re all caught up.
                  </p>
                  <span className="text-[11px] font-mono text-emerald-400 block">
                    No pending items
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-border/40">
            <Link
              href={
                pendingReviewDeliverables.length > 0
                  ? `/client/projects/${pendingReviewDeliverables[0].project_id}?tab=deliverables`
                  : "/client/projects"
              }
            >
              <Button
                variant="ghost"
                size="sm"
                className={`w-full h-8 text-xs font-semibold justify-between px-2 cursor-pointer ${
                  pendingReviewDeliverables.length > 0
                    ? "text-amber-300 hover:text-amber-200 hover:bg-amber-950/30"
                    : "text-foreground/80 hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <span>
                  {pendingReviewDeliverables.length > 0
                    ? "Review Deliverable"
                    : "View Deliverables"}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* CARD 3: OPEN REQUESTS */}
        <div className="p-4 rounded-xl border border-border/70 bg-card flex flex-col justify-between space-y-3 shadow-sm hover:border-border transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Open Requests
              </span>
              <div
                className={`h-2 w-2 rounded-full ${
                  waitingRequests.length > 0
                    ? "bg-amber-400 animate-pulse"
                    : activeRequests.length > 0
                    ? "bg-sky-400"
                    : "bg-emerald-400"
                }`}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
                  {activeRequests.length}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {activeRequests.length === 1 ? "Inquiry" : "Inquiries"}
                </span>
              </div>

              {waitingRequests.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-foreground truncate">
                    {waitingRequests[0].reference_number || "Request"}
                  </p>
                  <span className="text-[11px] font-mono text-amber-300 block pt-0.5">
                    Awaiting your response
                  </span>
                </div>
              ) : activeRequests.length > 0 ? (
                <div className="space-y-0.5 pt-1">
                  <p className="text-xs text-muted-foreground truncate">
                    {activeRequests[0].title}
                  </p>
                  <span className="text-[11px] font-mono text-sky-400 block">
                    In progress with team
                  </span>
                </div>
              ) : (
                <div className="space-y-0.5 pt-1">
                  <p className="text-xs text-muted-foreground">
                    No open requests
                  </p>
                  <span className="text-[11px] font-mono text-emerald-400 block">
                    Direct Support Desk
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-border/40">
            <Link href="/client/requests">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs font-semibold justify-between px-2 text-foreground/80 hover:text-foreground hover:bg-secondary/60 cursor-pointer"
              >
                <span>
                  {activeRequests.length > 0 ? "View Requests" : "New Request"}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* CARD 4: NEXT MEETING */}
        <div className="p-4 rounded-xl border border-border/70 bg-card flex flex-col justify-between space-y-3 shadow-sm hover:border-border transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Next Meeting
              </span>
              <div
                className={`h-2 w-2 rounded-full ${
                  upcomingMeeting ? "bg-amber-400" : "bg-muted-foreground/40"
                }`}
              />
            </div>

            {upcomingMeeting ? (
              <div className="space-y-1">
                <span className="text-base font-bold text-foreground block truncate tracking-tight">
                  {upcomingMeeting.title}
                </span>
                <p className="text-xs text-muted-foreground font-mono">
                  {formatDate(upcomingMeeting.starts_at)} · {formatTime(upcomingMeeting.starts_at)}
                </p>
                <span className="text-[11px] font-mono text-amber-300 block pt-0.5">
                  Scheduled
                </span>
              </div>
            ) : (
              <div className="py-2 space-y-1">
                <span className="text-2xl font-bold font-mono text-foreground block">
                  —
                </span>
                <p className="text-xs text-muted-foreground">
                  No upcoming meetings
                </p>
                <span className="text-[11px] font-mono text-muted-foreground block">
                  You&apos;re all caught up
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border/40">
            <Link href="/client/meetings">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs font-semibold justify-between px-2 text-foreground/80 hover:text-foreground hover:bg-secondary/60 cursor-pointer"
              >
                <span>{upcomingMeeting ? "View Meeting" : "View Meetings"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. ACTIVE PROJECT + OVERALL PROGRESS (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (2/3 width on desktop): ACTIVE PROJECT */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Active Project
            </h2>
            {projects.length > 1 && (
              <Link
                href="/client/projects"
                className="text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                View all ({projects.length}) →
              </Link>
            )}
          </div>

          {primaryProject && (
            <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm hover:border-border transition-all space-y-5">
              {/* Top Row: Title, Service Type, Status, CTA */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/client/projects/${primaryProject.id}`}
                      className="text-lg sm:text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors truncate"
                    >
                      {primaryProject.name}
                    </Link>
                    <ProjectStatusBadge status={primaryProject.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <ServiceTypeBadge serviceType={primaryProject.service_type} />
                  </div>
                </div>

                <Link
                  href={`/client/projects/${primaryProject.id}`}
                  className="shrink-0"
                >
                  <Button
                    size="sm"
                    className="h-8 text-xs px-3.5 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer"
                  >
                    <span>View Project</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>

              {/* Progress Bar & Milestone Counter */}
              <div className="space-y-2.5 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground font-mono text-sm">
                    {primaryProject.progress}%
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {primaryProject.milestone_count === 0
                      ? "No milestones defined"
                      : `${primaryProject.completed_milestone_count} of ${primaryProject.milestone_count} milestones completed`}
                  </span>
                </div>

                <ProjectProgressBar
                  progress={primaryProject.progress}
                  milestoneCount={primaryProject.milestone_count}
                  completedMilestoneCount={
                    primaryProject.completed_milestone_count
                  }
                />
              </div>

              {/* Current Phase & Target Date Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold px-2 py-0.5 rounded bg-secondary/80 border border-border/50 shrink-0">
                    Current Phase
                  </span>
                  <span className="text-foreground/90 font-medium truncate">
                    {primaryProject.next_milestone
                      ? primaryProject.next_milestone.name
                      : primaryProject.next_step}
                  </span>
                </div>

                {primaryProject.target_date && (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground shrink-0">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <span>Target: {formatDate(primaryProject.target_date)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (1/3 width on desktop): OVERALL PROGRESS DONUT */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Overall Progress
          </h2>

          <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm flex flex-col items-center justify-between space-y-5 h-full">
            {/* SVG Circular Donut Chart */}
            <div className="relative flex items-center justify-center pt-2">
              <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background track circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-secondary"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress stroke circle */}
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

              {/* Center percentage label */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
                  {milestoneStats.overallProgress}%
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                  Overall
                </span>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="w-full space-y-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                  <span>Completed</span>
                </span>
                <span className="font-mono font-medium text-foreground">
                  {milestoneStats.completed}{" "}
                  {milestoneStats.completed === 1 ? "milestone" : "milestones"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
                  <span>In Progress</span>
                </span>
                <span className="font-mono font-medium text-foreground">
                  {milestoneStats.inProgress}{" "}
                  {milestoneStats.inProgress === 1 ? "milestone" : "milestones"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span>Not Started</span>
                </span>
                <span className="font-mono font-medium text-foreground">
                  {milestoneStats.planned}{" "}
                  {milestoneStats.planned === 1 ? "milestone" : "milestones"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-border/40 font-semibold">
                <span className="text-foreground">Total</span>
                <span className="font-mono text-foreground">
                  {milestoneStats.total}{" "}
                  {milestoneStats.total === 1 ? "milestone" : "milestones"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. COMING UP + RECENT ACTIVITY (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: COMING UP */}
        <div className="space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Coming Up
            </h2>
            <p className="text-xs text-muted-foreground">
              Your upcoming payments, meetings and important deadlines.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card divide-y divide-border/40 shadow-sm">
            {/* Row 1: Next Payment */}
            <div className="p-4 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/60 shrink-0">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-semibold text-foreground block truncate">
                    Next Payment
                  </span>
                  {upcomingPayment ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {upcomingPayment.currency === "INR" ? "₹" : "$"}
                      {upcomingPayment.amount.toLocaleString("en-IN")}{" "}
                      {upcomingPayment.projectName && `· ${upcomingPayment.projectName}`}
                      {upcomingPayment.dueDate && ` · Due ${formatDate(upcomingPayment.dueDate)}`}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No upcoming payments scheduled
                    </p>
                  )}
                </div>
              </div>

              {upcomingPayment && (
                <Link href="/client/payments">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 border-border/80 hover:bg-secondary cursor-pointer shrink-0"
                  >
                    <span>Pay Now</span>
                  </Button>
                </Link>
              )}
            </div>

            {/* Row 2: Next Meeting */}
            <div className="p-4 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/60 shrink-0">
                  <Video className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-semibold text-foreground block truncate">
                    Next Meeting
                  </span>
                  {upcomingMeeting ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {upcomingMeeting.title} · {formatDate(upcomingMeeting.starts_at)} at {formatTime(upcomingMeeting.starts_at)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No upcoming meetings scheduled
                    </p>
                  )}
                </div>
              </div>

              {upcomingMeeting && (
                <Link href="/client/meetings">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 border-border/80 hover:bg-secondary cursor-pointer shrink-0"
                  >
                    <span>View</span>
                  </Button>
                </Link>
              )}
            </div>

            {/* Row 3: Deliverable Review (if pending) or Open Inquiry */}
            {pendingReviewDeliverables.length > 0 ? (
              <div className="p-4 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-400 border border-amber-500/30 shrink-0">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-semibold text-foreground block truncate">
                      Deliverable Review
                    </span>
                    <p className="text-xs text-muted-foreground truncate">
                      {pendingReviewDeliverables[0].title} · Awaiting your approval
                    </p>
                  </div>
                </div>

                <Link
                  href={`/client/projects/${pendingReviewDeliverables[0].project_id}?tab=deliverables`}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 bg-amber-950/30 border-amber-700/60 text-amber-200 hover:bg-amber-900/40 cursor-pointer shrink-0"
                  >
                    <span>Review</span>
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="p-4 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/60 shrink-0">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-semibold text-foreground block truncate">
                      Deliverables
                    </span>
                    <p className="text-xs text-muted-foreground">
                      All submitted deliverables are reviewed
                    </p>
                  </div>
                </div>

                <Link href="/client/projects">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 border-border/80 hover:bg-secondary cursor-pointer shrink-0"
                  >
                    <span>View</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: RECENT ACTIVITY */}
        <div className="space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Recent Activity
            </h2>
            <p className="text-xs text-muted-foreground">
              Latest updates from your projects.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card divide-y divide-border/40 shadow-sm">
            {recentActivities.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Activity will appear here as your project progresses.
              </div>
            ) : (
              recentActivities.slice(0, 4).map((act) => {
                const Icon =
                  act.category === "DELIVERABLE"
                    ? FileCheck
                    : act.category === "PAYMENT"
                    ? CreditCard
                    : act.category === "MEETING"
                    ? Video
                    : act.category === "PROJECT"
                    ? FolderKanban
                    : MessageSquare;

                return (
                  <div
                    key={act.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/60 shrink-0">
                        <Icon className="h-3.5 w-3.5" />
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
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. SUPPORT HORIZONTAL BANNER (Bottom) */}
      <div className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="h-9 w-9 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/60 shrink-0">
            <HelpCircle className="h-4 w-4 text-foreground/80" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">
              Have a question or need support?
            </h3>
            <p className="text-xs text-muted-foreground">
              We&apos;re here to help with anything related to your project.
            </p>
          </div>
        </div>

        <Link href="/client/requests" className="shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs px-3.5 gap-1.5 border-border/80 hover:bg-secondary font-medium w-full sm:w-auto cursor-pointer"
          >
            <span>New Request</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
