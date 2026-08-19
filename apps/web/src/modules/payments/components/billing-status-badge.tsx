import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { BillingPlanStatus, BillingScheduleStatus, PaymentStatus } from "../types";

interface BillingStatusBadgeProps {
  status: BillingPlanStatus | BillingScheduleStatus | PaymentStatus;
  className?: string;
}

export function BillingStatusBadge({ status, className }: BillingStatusBadgeProps) {
  switch (status) {
    case "PAID":
    case "COMPLETED":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-emerald-950/30 text-emerald-400 border-emerald-800/50 ${className || ""}`}
        >
          {status === "PAID" ? "Paid" : "Completed"}
        </Badge>
      );
    case "PARTIALLY_PAID":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-cyan-950/30 text-cyan-400 border-cyan-800/50 ${className || ""}`}
        >
          Partially Paid
        </Badge>
      );
    case "DUE":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-amber-950/40 text-amber-300 border-amber-800/60 animate-pulse ${className || ""}`}
        >
          Due Today
        </Badge>
      );
    case "OVERDUE":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-red-950/40 text-red-400 border-red-800/60 ${className || ""}`}
        >
          Overdue
        </Badge>
      );
    case "SCHEDULED":
    case "ACTIVE":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-blue-950/30 text-blue-400 border-blue-800/50 ${className || ""}`}
        >
          {status === "ACTIVE" ? "Active" : "Scheduled"}
        </Badge>
      );
    case "PENDING_VERIFICATION":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-yellow-950/30 text-yellow-400 border-yellow-800/50 ${className || ""}`}
        >
          Pending Verification
        </Badge>
      );
    case "PAUSED":
    case "DRAFT":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-zinc-900/60 text-zinc-400 border-zinc-700/50 ${className || ""}`}
        >
          {status === "DRAFT" ? "Draft" : "Paused"}
        </Badge>
      );
    case "CANCELLED":
    case "WAIVED":
    case "FAILED":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-zinc-900/60 text-zinc-500 border-zinc-800/60 line-through ${className || ""}`}
        >
          {status}
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
