"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ArrowRight, Inbox, Building2, FolderKanban, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RequestStatusBadge } from "./request-status-badge";
import { RequestPriorityBadge } from "./request-priority-badge";
import type {
  ClientRequestWithRelations,
  ClientRequestStatus,
  ClientRequestPriority,
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
  const [statusFilter, setStatusFilter] = React.useState<ClientRequestStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState<ClientRequestPriority | "ALL">("ALL");
  const [clientFilter, setClientFilter] = React.useState<string>("ALL");
  const [projectFilter, setProjectFilter] = React.useState<string>("ALL");

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

  const filteredRequests = React.useMemo(() => {
    return initialRequests.filter((req) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = req.title.toLowerCase().includes(q);
        const matchesDesc = req.description.toLowerCase().includes(q);
        const matchesClient = req.client?.name?.toLowerCase().includes(q);
        const matchesProject = req.project?.name?.toLowerCase().includes(q);
        const matchesDeliverable = req.deliverable?.title?.toLowerCase().includes(q);

        if (!matchesTitle && !matchesDesc && !matchesClient && !matchesProject && !matchesDeliverable) {
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
  }, [initialRequests, searchQuery, statusFilter, priorityFilter, clientFilter, projectFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    clientFilter !== "ALL" ||
    projectFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setClientFilter("ALL");
    setProjectFilter("ALL");
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <Card className="border-border/70 bg-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by request title, deliverable, project, or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>

            {/* Filter Reset if any */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Filter Dropdowns / Selectors */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ClientRequestStatus | "ALL")}
                aria-label="Filter by Status"
                className="w-full h-8 px-2.5 rounded-md text-xs bg-background border border-border/80 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as ClientRequestPriority | "ALL")}
                aria-label="Filter by Priority"
                className="w-full h-8 px-2.5 rounded-md text-xs bg-background border border-border/80 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="ALL">All Priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Client Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Client
              </label>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                aria-label="Filter by Client"
                className="w-full h-8 px-2.5 rounded-md text-xs bg-background border border-border/80 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
              >
                <option value="ALL">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Project
              </label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                aria-label="Filter by Project"
                className="w-full h-8 px-2.5 rounded-md text-xs bg-background border border-border/80 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
              >
                <option value="ALL">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm">
        <div className="p-4 bg-secondary/30 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Change Requests</span>
            <Badge variant="secondary" className="text-xs font-mono font-normal">
              {filteredRequests.length} of {initialRequests.length}
            </Badge>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-medium text-foreground">No requests found</h3>
              <p className="text-xs text-muted-foreground">
                {hasActiveFilters
                  ? "No change requests match your active filters. Try adjusting your query."
                  : "No change requests have been submitted by clients yet."}
              </p>
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs cursor-pointer mt-2"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/15 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4 font-semibold">Request</th>
                  <th className="py-3 px-4 font-semibold">Client</th>
                  <th className="py-3 px-4 font-semibold">Project</th>
                  <th className="py-3 px-4 font-semibold">Deliverable</th>
                  <th className="py-3 px-4 font-semibold">Priority</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-secondary/20 transition-colors group"
                  >
                    {/* Request Title */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <Link
                        href={`/hq/requests/${req.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 block"
                      >
                        {req.title}
                      </Link>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">
                        {req.description}
                      </span>
                    </td>

                    {/* Client */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {req.client ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground">{req.client.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Project */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {req.project ? (
                        <Link
                          href={`/hq/projects/${req.project_id}`}
                          className="hover:underline text-muted-foreground hover:text-foreground"
                        >
                          {req.project.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Deliverable */}
                    <td className="py-3.5 px-4 max-w-[180px]">
                      {req.deliverable ? (
                        <span className="text-foreground truncate block font-mono text-[11px]">
                          {req.deliverable.title}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <RequestPriorityBadge priority={req.priority} />
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <RequestStatusBadge status={req.status} />
                    </td>

                    {/* Created */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {formatDate(req.created_at)}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link href={`/hq/requests/${req.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2.5 gap-1 bg-background hover:bg-secondary border-border/70 cursor-pointer"
                        >
                          <span>Review</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
