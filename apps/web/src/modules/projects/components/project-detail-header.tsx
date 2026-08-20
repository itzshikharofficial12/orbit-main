"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, Target, LayoutGrid, Flag, CheckSquare, Package, CreditCard } from "lucide-react";
import { ProjectStatusBadge } from "./project-status-badge";
import { ServiceTypeBadge } from "./service-type-badge";
import { EditProjectDialog } from "./edit-project-dialog";
import { updateProjectStatusAction } from "../actions";
import type { ProjectWithClient, ProjectStatus } from "../types";
import { cn } from "@/lib/utils";

interface ProjectDetailHeaderProps {
  project: ProjectWithClient;
  activeTab?: "overview" | "milestones" | "tasks" | "deliverables" | "billing";
  milestoneCount?: number;
  taskCount?: number;
  deliverableCount?: number;
  billingCount?: number;
}

export function ProjectDetailHeader({
  project,
  activeTab = "overview",
  milestoneCount,
  taskCount,
  deliverableCount,
  billingCount,
}: ProjectDetailHeaderProps) {
  const [currentStatus, setCurrentStatus] = React.useState<ProjectStatus>(project.status);
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    setCurrentStatus(project.status);
  }, [project.status]);

  async function handleStatusChange(newStatus: ProjectStatus) {
    if (newStatus === currentStatus || isUpdating) return;

    setIsUpdating(true);
    setCurrentStatus(newStatus);

    const result = await updateProjectStatusAction(project.id, newStatus);
    if (!result.success) {
      setCurrentStatus(project.status);
    }
    setIsUpdating(false);
  }

  function formatDate(iso: string | null) {
    if (!iso) return "Not specified";
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

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      href: `/hq/projects/${project.id}?tab=overview`,
      icon: LayoutGrid,
    },
    {
      id: "milestones",
      label: "Milestones",
      href: `/hq/projects/${project.id}?tab=milestones`,
      icon: Flag,
      badge: milestoneCount !== undefined ? milestoneCount : project.milestone_count,
    },
    {
      id: "tasks",
      label: "Tasks",
      href: `/hq/projects/${project.id}?tab=tasks`,
      icon: CheckSquare,
      badge: taskCount,
    },
    {
      id: "deliverables",
      label: "Deliverables",
      href: `/hq/projects/${project.id}?tab=deliverables`,
      icon: Package,
      badge: deliverableCount,
    },
    {
      id: "billing",
      label: "Billing & Invoices",
      href: `/hq/projects/${project.id}?tab=billing`,
      icon: CreditCard,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back to Projects */}
      <div>
        <Link
          href="/hq/projects"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Projects</span>
        </Link>
      </div>

      {/* Main Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 pb-5 border-b border-border/40">
        <div className="space-y-3">
          {/* Title and Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {project.name}
            </h1>
            <ProjectStatusBadge status={currentStatus} />
            <ServiceTypeBadge serviceType={project.service_type} />
          </div>

          {/* Metadata Row: Client, Target Date, Progress */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {project.client && (
              <div className="flex items-center gap-1.5">
                <span>Client:</span>
                <Link
                  href={`/hq/clients/${project.client_id}`}
                  className="font-medium text-foreground hover:underline inline-flex items-center gap-1.5"
                >
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{project.client.name}</span>
                </Link>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Target date:</span>
              <span className="font-medium text-foreground">{formatDate(project.target_date)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Progress:</span>
              <span className="font-mono font-medium text-foreground">{project.progress}%</span>
            </div>
          </div>
        </div>

        {/* Actions Slot: Status Selector & Edit Project Dialog */}
        <div className="flex items-center gap-3 flex-wrap pt-1">
          <div className="flex items-center gap-2">
            <label htmlFor="project_status_changer" className="text-xs text-muted-foreground">
              Status:
            </label>
            <select
              id="project_status_changer"
              value={currentStatus}
              disabled={isUpdating}
              onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
              className="h-8 rounded-md border border-border/80 bg-secondary/80 px-2.5 text-xs text-foreground font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="PLANNING">PLANNING</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ON_HOLD">ON_HOLD</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          <EditProjectDialog project={project} />
        </div>
      </div>

      {/* Project Navigation Tabs */}
      <div className="border-b border-border/40">
        <nav className="flex space-x-1 sm:space-x-2" aria-label="Project Sections">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-[1px]",
                  isActive
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/80"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      "ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full font-mono",
                      isActive
                        ? "bg-secondary text-foreground font-semibold"
                        : "bg-secondary/60 text-muted-foreground"
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

