"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { ProjectStatusBadge } from "./project-status-badge";
import { ServiceTypeBadge } from "./service-type-badge";
import { EditProjectDialog } from "./edit-project-dialog";
import { updateProjectStatusAction } from "../actions";
import type { ProjectWithClient, ProjectStatus } from "../types";

interface ProjectDetailHeaderProps {
  project: ProjectWithClient;
}

export function ProjectDetailHeader({ project }: ProjectDetailHeaderProps) {
  const [currentStatus, setCurrentStatus] = React.useState<ProjectStatus>(project.status);
  const [isUpdating, setIsUpdating] = React.useState(false);

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

  return (
    <div className="space-y-4">
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/40">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {project.name}
            </h1>
            <ProjectStatusBadge status={currentStatus} />
            <ServiceTypeBadge serviceType={project.service_type} />
          </div>

          {/* Client Relationship Link */}
          {project.client && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
        </div>

        {/* Actions Slot: Status Changer & Edit Modal */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label htmlFor="project_status_changer" className="text-xs text-muted-foreground">
              Status:
            </label>
            <select
              id="project_status_changer"
              value={currentStatus}
              disabled={isUpdating}
              onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
              className="h-8 rounded-md border border-border/80 bg-secondary/80 px-2.5 text-xs text-foreground font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
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
    </div>
  );
}
