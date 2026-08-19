import * as React from "react";
import { CircleDot, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ClientRequestStatus } from "../types";

interface RequestStatusBadgeProps {
  status: ClientRequestStatus;
  className?: string;
}

export function RequestStatusBadge({ status, className }: RequestStatusBadgeProps) {
  switch (status) {
    case "OPEN":
      return (
        <Badge
          variant="outline"
          className={`border-amber-700/60 bg-amber-950/30 text-amber-300 gap-1 text-[11px] font-medium font-mono ${className || ""}`}
        >
          <CircleDot className="h-3 w-3 text-amber-400" />
          <span>Open</span>
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge
          variant="outline"
          className={`border-sky-800/60 bg-sky-950/30 text-sky-300 gap-1 text-[11px] font-medium font-mono ${className || ""}`}
        >
          <Clock className="h-3 w-3 text-sky-400" />
          <span>In Progress</span>
        </Badge>
      );
    case "RESOLVED":
      return (
        <Badge
          variant="outline"
          className={`border-emerald-800/60 bg-emerald-950/30 text-emerald-300 gap-1 text-[11px] font-medium font-mono ${className || ""}`}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          <span>Resolved</span>
        </Badge>
      );
    case "CLOSED":
    default:
      return (
        <Badge
          variant="outline"
          className={`border-zinc-800 bg-zinc-900/60 text-zinc-400 gap-1 text-[11px] font-medium font-mono ${className || ""}`}
        >
          <XCircle className="h-3 w-3 text-zinc-500" />
          <span>Closed</span>
        </Badge>
      );
  }
}
