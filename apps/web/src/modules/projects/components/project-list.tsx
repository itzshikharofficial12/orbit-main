"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ChevronRight, FolderKanban, Calendar, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProjectStatusBadge } from "./project-status-badge";
import { ServiceTypeBadge } from "./service-type-badge";
import { ProjectProgressBar } from "./project-progress-bar";
import type { ProjectWithClient, ProjectStatus, ServiceType } from "../types";
import { cn } from "@/lib/utils";

interface ProjectListProps {
  initialProjects: ProjectWithClient[];
  clients?: Array<{ id: string; name: string }>;
  showClientColumn?: boolean;
}

export function ProjectList({
  initialProjects,
  clients = [],
  showClientColumn = true,
}: ProjectListProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<ProjectStatus | "ALL">("ALL");
  const [selectedService, setSelectedService] = React.useState<ServiceType | "ALL">("ALL");
  const [selectedClientId, setSelectedClientId] = React.useState<string>("ALL");

  const filteredProjects = React.useMemo(() => {
    return initialProjects.filter((project) => {
      // Status filter
      if (selectedStatus !== "ALL" && project.status !== selectedStatus) {
        return false;
      }

      // Service filter
      if (selectedService !== "ALL" && project.service_type !== selectedService) {
        return false;
      }

      // Client filter
      if (selectedClientId !== "ALL" && project.client_id !== selectedClientId) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = project.name.toLowerCase().includes(q);
        const matchesClient = project.client?.name.toLowerCase().includes(q);
        const matchesDesc = project.description?.toLowerCase().includes(q);
        return matchesName || matchesClient || matchesDesc;
      }

      return true;
    });
  }, [initialProjects, searchQuery, selectedStatus, selectedService, selectedClientId]);

  const statusCounts = React.useMemo(() => {
    const counts = {
      ALL: initialProjects.length,
      PLANNING: 0,
      ACTIVE: 0,
      ON_HOLD: 0,
      IN_REVIEW: 0,
      COMPLETED: 0,
      ARCHIVED: 0,
    };
    initialProjects.forEach((p) => {
      if (p.status in counts) {
        counts[p.status as ProjectStatus] += 1;
      }
    });
    return counts;
  }, [initialProjects]);

  const filterTabs: Array<{ id: ProjectStatus | "ALL"; label: string; count: number }> = [
    { id: "ALL", label: "All Projects", count: statusCounts.ALL },
    { id: "ACTIVE", label: "Active", count: statusCounts.ACTIVE },
    { id: "PLANNING", label: "Planning", count: statusCounts.PLANNING },
    { id: "IN_REVIEW", label: "In Review", count: statusCounts.IN_REVIEW },
    { id: "ON_HOLD", label: "On Hold", count: statusCounts.ON_HOLD },
    { id: "COMPLETED", label: "Completed", count: statusCounts.COMPLETED },
    { id: "ARCHIVED", label: "Archived", count: statusCounts.ARCHIVED },
  ];

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

  const isFiltered =
    searchQuery.trim() !== "" ||
    selectedStatus !== "ALL" ||
    selectedService !== "ALL" ||
    selectedClientId !== "ALL";

  function handleClearFilters() {
    setSearchQuery("");
    setSelectedStatus("ALL");
    setSelectedService("ALL");
    setSelectedClientId("ALL");
  }

  return (
    <div className="space-y-6">
      {/* Search and Secondary Filter Controls */}
      <div className="flex flex-col gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                selectedStatus === tab.id
                  ? "bg-secondary text-foreground font-semibold border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "text-[11px] px-1.5 py-0.5 rounded-full font-mono",
                  selectedStatus === tab.id
                    ? "bg-card text-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar + Select Dropdowns */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-card/40"
            />
          </div>

          {/* Service & Client Selects */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Service Filter */}
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value as ServiceType | "ALL")}
              className="h-9 rounded-md border border-input bg-card/60 px-3 py-1 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="ALL">All Services</option>
              <option value="BRAND_FOUNDATION">Brand Foundation</option>
              <option value="SAAS_WEBSITE">SaaS Website</option>
              <option value="GROWTH_ENGINE">Growth Engine</option>
              <option value="AI_OPERATIONS">AI Operations</option>
            </select>

            {/* Client Filter (if clients provided) */}
            {clients.length > 0 && showClientColumn && (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="h-9 rounded-md border border-input bg-card/60 px-3 py-1 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer max-w-[160px] truncate"
              >
                <option value="ALL">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="rounded-xl border border-border/60 bg-card/30 p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="rounded-full bg-secondary/60 p-3.5 text-muted-foreground border border-border/40">
              <FolderKanban className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium text-foreground">
                {isFiltered ? "No matching projects" : "No projects found"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {isFiltered
                  ? "Try resetting your search query or filters to find project engagements."
                  : "Create the first project engagement to track milestones and deliverables."}
              </p>
            </div>
            {isFiltered && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Desktop Data Table */}
      {filteredProjects.length > 0 && (
        <>
          <div className="hidden md:block rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30 text-[11px] font-medium uppercase tracking-wider text-muted-foreground font-mono">
                  <th className="py-3 px-5">Project</th>
                  {showClientColumn && <th className="py-3 px-5">Client</th>}
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 w-44">Progress</th>
                  <th className="py-3 px-5">Target Date</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-accent/40 transition-colors group cursor-pointer"
                    onClick={() => {
                      window.location.href = `/hq/projects/${project.id}`;
                    }}
                  >
                    {/* Project Name & Service Badge */}
                    <td className="py-4 px-5">
                      <div className="flex flex-col space-y-1">
                        <Link
                          href={`/hq/projects/${project.id}`}
                          className="font-semibold text-foreground group-hover:text-primary transition-colors inline-block truncate max-w-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {project.name}
                        </Link>
                        <div>
                          <ServiceTypeBadge serviceType={project.service_type} />
                        </div>
                      </div>
                    </td>

                    {/* Client Name */}
                    {showClientColumn && (
                      <td className="py-4 px-5">
                        {project.client ? (
                          <Link
                            href={`/hq/clients/${project.client_id}`}
                            className="font-medium text-foreground hover:underline inline-flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{project.client.name}</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">
                            {project.client_id.slice(0, 8)}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Status */}
                    <td className="py-4 px-5">
                      <ProjectStatusBadge status={project.status} />
                    </td>

                    {/* Progress Bar */}
                    <td className="py-4 px-5">
                      <ProjectProgressBar
                        progress={project.progress}
                        milestoneCount={project.milestone_count}
                        completedMilestoneCount={project.completed_milestone_count}
                      />
                    </td>

                    {/* Target Date */}
                    <td className="py-4 px-5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(project.target_date)}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-5 text-right">
                      <Link
                        href={`/hq/projects/${project.id}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground group-hover:text-foreground hover:bg-secondary transition-colors"
                        aria-label={`Open ${project.name} workspace`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                href={`/hq/projects/${project.id}`}
                className="block rounded-xl border border-border/70 bg-card p-5 shadow-sm hover:border-border transition-colors space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-base truncate">
                      {project.name}
                    </h4>
                    {project.client && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{project.client.name}</span>
                      </p>
                    )}
                  </div>
                  <ProjectStatusBadge status={project.status} />
                </div>

                <div>
                  <ServiceTypeBadge serviceType={project.service_type} />
                </div>

                <div className="pt-2 border-t border-border/40 space-y-2">
                  <ProjectProgressBar
                    progress={project.progress}
                    milestoneCount={project.milestone_count}
                    completedMilestoneCount={project.completed_milestone_count}
                  />

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Target: {formatDate(project.target_date)}
                    </span>
                    <span>Updated: {formatDate(project.updated_at)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
