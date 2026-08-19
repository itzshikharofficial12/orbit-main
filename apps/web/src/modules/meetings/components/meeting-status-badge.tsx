import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { MeetingStatus } from "../types";

interface MeetingStatusBadgeProps {
  status: MeetingStatus;
  className?: string;
}

export function MeetingStatusBadge({ status, className }: MeetingStatusBadgeProps) {
  switch (status) {
    case "SCHEDULED":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-blue-950/30 text-blue-400 border-blue-800/50 ${className || ""}`}
        >
          Scheduled
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-emerald-950/30 text-emerald-400 border-emerald-800/50 ${className || ""}`}
        >
          Completed
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-zinc-900/60 text-zinc-400 border-zinc-700/50 ${className || ""}`}
        >
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={`font-mono text-[11px] ${className || ""}`}>
          {status}
        </Badge>
      );
  }
}
