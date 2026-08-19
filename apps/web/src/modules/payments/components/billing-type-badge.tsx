import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { BillingType } from "../types";

interface BillingTypeBadgeProps {
  type: BillingType;
  className?: string;
}

export function BillingTypeBadge({ type, className }: BillingTypeBadgeProps) {
  switch (type) {
    case "ONE_TIME":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-blue-950/30 text-blue-400 border-blue-800/50 ${className || ""}`}
        >
          One-Time
        </Badge>
      );
    case "INSTALLMENTS":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-purple-950/30 text-purple-400 border-purple-800/50 ${className || ""}`}
        >
          Installments
        </Badge>
      );
    case "RECURRING":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-teal-950/30 text-teal-400 border-teal-800/50 ${className || ""}`}
        >
          Recurring
        </Badge>
      );
    case "MILESTONE":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-amber-950/30 text-amber-400 border-amber-800/50 ${className || ""}`}
        >
          Milestone
        </Badge>
      );
    case "CUSTOM":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-zinc-900/60 text-zinc-300 border-zinc-700/50 ${className || ""}`}
        >
          Custom
        </Badge>
      );
    case "HYBRID":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-indigo-950/30 text-indigo-400 border-indigo-800/50 ${className || ""}`}
        >
          Hybrid
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={`font-mono text-[11px] ${className || ""}`}>
          {type}
        </Badge>
      );
  }
}
