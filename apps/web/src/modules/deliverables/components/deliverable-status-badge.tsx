import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { DeliverableStatus } from "../types";

interface DeliverableStatusBadgeProps {
  status: DeliverableStatus;
  className?: string;
}

const statusConfig: Record<
  DeliverableStatus,
  { label: string; className: string }
> = {
  PLANNED: {
    label: "Planned",
    className: "border-zinc-800 bg-zinc-900/60 text-zinc-400",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "border-sky-900/60 bg-sky-950/40 text-sky-400",
  },
  READY_FOR_REVIEW: {
    label: "Ready for Review",
    className: "border-amber-700/60 bg-amber-950/50 text-amber-300 font-medium",
  },
  CHANGES_REQUESTED: {
    label: "Changes Requested",
    className: "border-orange-800/60 bg-orange-950/40 text-orange-400",
  },
  APPROVED: {
    label: "Approved",
    className: "border-emerald-900/60 bg-emerald-950/40 text-emerald-400 font-medium",
  },
  ARCHIVED: {
    label: "Archived",
    className: "border-zinc-800 bg-zinc-900/40 text-zinc-500",
  },
};

export function DeliverableStatusBadge({
  status,
  className = "",
}: DeliverableStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PLANNED;

  return (
    <Badge
      variant="outline"
      className={`text-[11px] tracking-wide px-2 py-0.5 whitespace-nowrap ${config.className} ${className}`}
    >
      {config.label}
    </Badge>
  );
}
