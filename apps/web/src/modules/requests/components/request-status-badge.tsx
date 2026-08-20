import * as React from "react";
import { CircleDot, Clock, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "../types";

interface RequestStatusBadgeProps {
  status: RequestStatus | string;
  className?: string;
}

export function RequestStatusBadge({ status, className }: RequestStatusBadgeProps) {
  switch (status) {
    case "OPEN":
      return (
        <Badge
          variant="outline"
          className={`border-zinc-700/60 bg-zinc-800/40 text-zinc-300 gap-1 text-[11px] font-medium font-mono ${className || ""}`}
        >
          <CircleDot className="h-3 w-3 text-zinc-400" />
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
    case "WAITING_FOR_CLIENT":
      return (
        <Badge
          variant="outline"
          className={`border-amber-700/60 bg-amber-950/40 text-amber-300 gap-1 text-[11px] font-medium font-mono ${className || ""}`}
        >
          <HelpCircle className="h-3 w-3 text-amber-400" />
          <span>Waiting on Client</span>
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
