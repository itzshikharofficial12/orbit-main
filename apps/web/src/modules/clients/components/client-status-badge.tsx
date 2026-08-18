import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { ClientStatus } from "../types";
import { cn } from "@/lib/utils";

interface ClientStatusBadgeProps {
  status: ClientStatus;
  className?: string;
}

const statusConfig: Record<
  ClientStatus,
  { label: string; variant: "active" | "paused" | "completed" | "archived" }
> = {
  ACTIVE: { label: "Active", variant: "active" },
  PAUSED: { label: "Paused", variant: "paused" },
  COMPLETED: { label: "Completed", variant: "completed" },
  ARCHIVED: { label: "Archived", variant: "archived" },
};

export function ClientStatusBadge({ status, className }: ClientStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "archived" };

  return (
    <Badge variant={config.variant} className={cn("capitalize select-none", className)}>
      <span className="h-1.5 w-1.5 rounded-full mr-1.5 inline-block bg-current opacity-80" />
      {config.label}
    </Badge>
  );
}
