import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "../types";
import { cn } from "@/lib/utils";

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

const statusConfig: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  PLANNING: {
    label: "Planning",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-400 font-normal text-xs",
  },
  ACTIVE: {
    label: "Active",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-normal text-xs",
  },
  ON_HOLD: {
    label: "On Hold",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-400 font-normal text-xs",
  },
  IN_REVIEW: {
    label: "In Review",
    className: "border-purple-500/20 bg-purple-500/10 text-purple-400 font-normal text-xs",
  },
  COMPLETED: {
    label: "Completed",
    className: "border-blue-500/20 bg-blue-500/10 text-blue-400 font-normal text-xs",
  },
  ARCHIVED: {
    label: "Archived",
    className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-400 font-normal text-xs",
  },
};

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-400 font-normal text-xs",
  };

  return (
    <Badge className={cn("capitalize select-none", config.className, className)}>
      <span className="h-1.5 w-1.5 rounded-full mr-1.5 inline-block bg-current opacity-80" />
      {config.label}
    </Badge>
  );
}
