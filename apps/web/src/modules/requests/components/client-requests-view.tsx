"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Inbox,
  MessageSquare,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewRequestModal } from "./new-request-modal";
import {
  getCategoryInfo,
  getStatusInfo,
  getPriorityInfo,
  formatRequestDate,
} from "../utils";
import type { ClientRequestWithRelations, RequestStats } from "../types";

interface ClientRequestsViewProps {
  initialRequests: ClientRequestWithRelations[];
  stats: RequestStats;
  projects?: Array<{ id: string; name: string }>;
  deliverables?: Array<{ id: string; title: string; projectId: string }>;
}

export function ClientRequestsView({
  initialRequests,
  stats,
  projects = [],
  deliverables = [],
}: ClientRequestsViewProps) {
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"ALL" | "ACTIVE" | "ATTENTION" | "RESOLVED">("ALL");

  // Partition requests into sections
  const attentionItems = React.useMemo(() => {
    return initialRequests.filter((r) => r.status === "WAITING_FOR_CLIENT");
  }, [initialRequests]);

  const activeItems = React.useMemo(() => {
    return initialRequests.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS");
  }, [initialRequests]);

  const resolvedItems = React.useMemo(() => {
    return initialRequests.filter((r) => r.status === "RESOLVED" || r.status === "CLOSED");
  }, [initialRequests]);

  const displayedItems = React.useMemo(() => {
    if (activeTab === "ATTENTION") return attentionItems;
    if (activeTab === "ACTIVE") return activeItems;
    if (activeTab === "RESOLVED") return resolvedItems;
    return initialRequests;
  }, [activeTab, attentionItems, activeItems, resolvedItems, initialRequests]);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Support & Requests
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ask a question, report an issue, or request an update from Celestia Studios.
          </p>
        </div>

        <Button
          onClick={() => setIsNewModalOpen(true)}
          className="h-9 px-4 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Request</span>
        </Button>
      </div>

      {/* 2. Compact Request Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold block">
            Open
          </span>
          <span className="text-xl font-bold font-mono text-foreground block">
            {stats.open}
          </span>
          <span className="text-[11px] text-muted-foreground block">Awaiting triage</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-semibold block">
            In Progress
          </span>
          <span className="text-xl font-bold font-mono text-blue-400 block">
            {stats.inProgress}
          </span>
          <span className="text-[11px] text-muted-foreground block">Under investigation</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold block">
            Waiting for You
          </span>
          <span className="text-xl font-bold font-mono text-amber-400 block">
            {stats.waitingForClient}
          </span>
          <span className="text-[11px] text-muted-foreground block">Your response needed</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block">
            Resolved
          </span>
          <span className="text-xl font-bold font-mono text-emerald-400 block">
            {stats.resolved + stats.closed}
          </span>
          <span className="text-[11px] text-muted-foreground block">Completed inquiries</span>
        </div>
      </div>

      {/* 3. Filter Tabs */}
      <div className="space-y-4">
        <div className="border-b border-border/60">
          <nav className="flex space-x-2" aria-label="Request Categories">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-[1px] ${
                activeTab === "ALL"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>All Requests</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-secondary font-mono">
                {initialRequests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ACTIVE")}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-[1px] ${
                activeTab === "ACTIVE"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Active</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-secondary font-mono">
                {activeItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ATTENTION")}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-[1px] ${
                activeTab === "ATTENTION"
                  ? "border-amber-400 text-amber-400 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Needs Your Attention</span>
              {attentionItems.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-400 font-mono font-semibold">
                  {attentionItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("RESOLVED")}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-[1px] ${
                activeTab === "RESOLVED"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Resolved</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-secondary font-mono">
                {resolvedItems.length}
              </span>
            </button>
          </nav>
        </div>

        {/* 4. Requests List */}
        {displayedItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-12 text-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground border border-border/40 mx-auto">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {activeTab === "RESOLVED"
                  ? "No resolved requests yet"
                  : activeTab === "ATTENTION"
                  ? "No action required from you"
                  : "No requests yet"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Questions, issues, or change requests can be raised directly here for fast response from Celestia Studios.
              </p>
            </div>
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => setIsNewModalOpen(true)}
                className="text-xs h-8 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Request</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedItems.map((req) => {
              const catInfo = getCategoryInfo(req.category);
              const statInfo = getStatusInfo(req.status);
              const prioInfo = getPriorityInfo(req.priority);
              const CategoryIcon = catInfo.icon;
              const refNumber = req.reference_number || `REQ-${req.id.slice(0, 4).toUpperCase()}`;

              return (
                <Link
                  key={req.id}
                  href={`/client/requests/${req.id}`}
                  className={`block p-4 rounded-xl border transition-all hover:border-border group ${
                    req.status === "WAITING_FOR_CLIENT"
                      ? "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10 shadow-sm"
                      : req.status === "RESOLVED" || req.status === "CLOSED"
                      ? "bg-card/60 border-border/60 opacity-85 hover:opacity-100"
                      : "bg-card border-border/70 hover:bg-card/90 shadow-sm"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Metadata & Title */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Human-readable reference number */}
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-secondary text-foreground border border-border/60">
                          {refNumber}
                        </span>

                        {/* Category Badge */}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${catInfo.colorClass}`}
                        >
                          <CategoryIcon className="h-2.5 w-2.5" />
                          <span>{catInfo.label}</span>
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${statInfo.colorClass}`}
                        >
                          {statInfo.label}
                        </span>

                        {/* Priority Badge */}
                        {req.priority === "HIGH" && (
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${prioInfo.colorClass}`}
                          >
                            High Priority
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {req.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {req.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono pt-0.5">
                        {req.project && (
                          <span className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3 text-muted-foreground/70" />
                            <span>{req.project.name}</span>
                          </span>
                        )}
                        <span>Updated {formatRequestDate(req.updated_at || req.created_at)}</span>
                        {(req.messages_count || 0) > 0 && (
                          <span className="flex items-center gap-1 text-foreground/80">
                            <MessageSquare className="h-3 w-3" />
                            <span>{req.messages_count} response{req.messages_count === 1 ? "" : "s"}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Action */}
                    <div className="flex items-center justify-end shrink-0 pt-1 sm:pt-0">
                      <Button
                        size="sm"
                        variant={req.status === "WAITING_FOR_CLIENT" ? "default" : "outline"}
                        className="h-8 text-xs px-3 gap-1 shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                      >
                        <span>View Request</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {isNewModalOpen && (
        <NewRequestModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          projects={projects}
          deliverables={deliverables}
        />
      )}
    </div>
  );
}
