"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  ArrowRight,
  Inbox,
  Building2,
  FolderKanban,
  Filter,
  MessageSquare,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RequestStatusBadge } from "./request-status-badge";
import { RequestPriorityBadge } from "./request-priority-badge";
import {
  getCategoryInfo,
  getStatusInfo,
  getPriorityInfo,
  formatRequestDate,
} from "../utils";
import type {
  ClientRequestWithRelations,
  RequestStatus,
  ClientRequestPriority,
  RequestCategory,
} from "../types";
import type { Client, Project } from "@/lib/supabase/types";

interface AdminRequestsDirectoryProps {
  initialRequests: ClientRequestWithRelations[];
  clients: Pick<Client, "id" | "name">[];
  projects: Pick<Project, "id" | "name">[];
}

export function AdminRequestsDirectory({
  initialRequests,
  clients,
  projects,
}: AdminRequestsDirectoryProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<RequestStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState<ClientRequestPriority | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState<RequestCategory | "ALL">("ALL");
  const [clientFilter, setClientFilter] = React.useState<string>("ALL");
  const [projectFilter, setProjectFilter] = React.useState<string>("ALL");

  const filteredRequests = React.useMemo(() => {
    return initialRequests.filter((req) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = req.reference_number?.toLowerCase().includes(q);
        const matchesTitle = req.title.toLowerCase().includes(q);
        const matchesDesc = req.description.toLowerCase().includes(q);
        const matchesClient = req.client?.name?.toLowerCase().includes(q);
        const matchesProject = req.project?.name?.toLowerCase().includes(q);
        const matchesDeliverable = req.deliverable?.title?.toLowerCase().includes(q);

        if (
          !matchesRef &&
          !matchesTitle &&
          !matchesDesc &&
          !matchesClient &&
          !matchesProject &&
          !matchesDeliverable
        ) {
          return false;
        }
      }

      // Status
      if (statusFilter !== "ALL" && req.status !== statusFilter) {
        return false;
      }

      // Priority
      if (priorityFilter !== "ALL" && req.priority !== priorityFilter) {
        return false;
      }

      // Category
      if (categoryFilter !== "ALL" && req.category !== categoryFilter) {
        return false;
      }

      // Client
      if (clientFilter !== "ALL" && req.client_id !== clientFilter) {
        return false;
      }

      // Project
      if (projectFilter !== "ALL" && req.project_id !== projectFilter) {
        return false;
      }

      return true;
    });
  }, [
    initialRequests,
    searchQuery,
    statusFilter,
    priorityFilter,
    categoryFilter,
    clientFilter,
    projectFilter,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    clientFilter !== "ALL" ||
    projectFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCategoryFilter("ALL");
    setClientFilter("ALL");
    setProjectFilter("ALL");
  }

  // Count summaries
  const totalCount = initialRequests.length;
  const openCount = initialRequests.filter((r) => r.status === "OPEN").length;
  const inProgressCount = initialRequests.filter((r) => r.status === "IN_PROGRESS").length;
  const waitingClientCount = initialRequests.filter((r) => r.status === "WAITING_FOR_CLIENT").length;
  const resolvedCount = initialRequests.filter((r) => r.status === "RESOLVED" || r.status === "CLOSED").length;

  return (
    <div className="space-y-6">
      {/* 1. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
            Total Requests
          </span>
          <span className="text-xl font-bold font-mono text-foreground block">
            {totalCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block font-semibold">
            Open
          </span>
          <span className="text-xl font-bold font-mono text-amber-400 block">
            {openCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 block font-semibold">
            In Progress
          </span>
          <span className="text-xl font-bold font-mono text-blue-400 block">
            {inProgressCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 block font-semibold">
            Waiting on Client
          </span>
          <span className="text-xl font-bold font-mono text-purple-400 block">
            {waitingClientCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block font-semibold">
            Resolved
          </span>
          <span className="text-xl font-bold font-mono text-emerald-400 block">
            {resolvedCount}
          </span>
        </div>
      </div>

      {/* 2. Search and Multi-Dimensional Filter Toolbar */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search requests by reference, title, client, or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-background"
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-xs px-3 text-muted-foreground hover:text-foreground shrink-0"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-border/40 text-xs">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as RequestCategory | "ALL")}
              className="h-8 px-2 rounded border border-border/80 bg-background text-foreground text-xs focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="GENERAL">General</option>
              <option value="PROJECT">Project</option>
              <option value="DELIVERABLE">Deliverable</option>
              <option value="PAYMENT">Payment</option>
              <option value="MEETING">Meeting</option>
              <option value="TECHNICAL">Technical Issue</option>
              <option value="OTHER">Other</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "ALL")}
              className="h-8 px-2 rounded border border-border/80 bg-background text-foreground text-xs focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_CLIENT">Waiting for Client</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as ClientRequestPriority | "ALL")}
              className="h-8 px-2 rounded border border-border/80 bg-background text-foreground text-xs focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            {/* Client Filter */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="h-8 px-2 rounded border border-border/80 bg-background text-foreground text-xs focus:outline-none"
            >
              <option value="ALL">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 px-2 rounded border border-border/80 bg-background text-foreground text-xs focus:outline-none"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 3. Requests List */}
      {filteredRequests.length === 0 ? (
        <Card className="border-border/70 bg-card">
          <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-2">
            <div className="h-9 w-9 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/50">
              <Inbox className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No requests found</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {hasActiveFilters
                ? "Try adjusting your search criteria or filter selections."
                : "No client change requests have been submitted yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredRequests.map((req) => {
            const catInfo = getCategoryInfo(req.category);
            const CategoryIcon = catInfo.icon;
            const refNumber = req.reference_number || `REQ-${req.id.slice(0, 4).toUpperCase()}`;

            return (
              <Link
                key={req.id}
                href={`/hq/requests/${req.id}`}
                className="block p-4 rounded-xl border border-border/70 bg-card hover:border-border transition-all hover:bg-card/90 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-secondary text-foreground border border-border/60">
                        {refNumber}
                      </span>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${catInfo.colorClass}`}
                      >
                        <CategoryIcon className="h-2.5 w-2.5" />
                        <span>{catInfo.label}</span>
                      </span>

                      <RequestStatusBadge status={req.status} />
                      <RequestPriorityBadge priority={req.priority} />
                    </div>

                    <h3 className="text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {req.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-mono">
                      {req.client && (
                        <span className="flex items-center gap-1 text-foreground/80">
                          <Building2 className="h-3 w-3 text-muted-foreground/70" />
                          <span>{req.client.name}</span>
                        </span>
                      )}

                      {req.project && (
                        <span className="flex items-center gap-1">
                          <FolderKanban className="h-3 w-3 text-muted-foreground/70" />
                          <span>{req.project.name}</span>
                        </span>
                      )}

                      <span>{formatRequestDate(req.created_at)}</span>

                      {(req.messages_count || 0) > 0 && (
                        <span className="flex items-center gap-1 text-foreground/80">
                          <MessageSquare className="h-3 w-3" />
                          <span>{req.messages_count} reply{req.messages_count === 1 ? "" : "s"}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs px-3 gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                    >
                      <span>Review</span>
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
  );
}
