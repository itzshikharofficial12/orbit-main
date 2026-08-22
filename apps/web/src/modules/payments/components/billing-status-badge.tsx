import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { BillingPlanStatus, BillingScheduleStatus, PaymentStatus } from "../types";

interface BillingStatusBadgeProps {
  status: BillingPlanStatus | BillingScheduleStatus | PaymentStatus | "UNDER_VERIFICATION" | "VERIFIED" | "REJECTED" | string;
  label?: string;
  className?: string;
}

export function BillingStatusBadge({ status, label, className }: BillingStatusBadgeProps) {
  const upper = String(status || "").toUpperCase();

  switch (upper) {
    case "PAID":
    case "VERIFIED":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1 ${className || ""}`}
        >
          <span className="font-sans">✓</span>
          <span>{label || (upper === "VERIFIED" ? "Verified" : "Paid")}</span>
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border-emerald-500/20 ${className || ""}`}
        >
          {label || "Completed"}
        </Badge>
      );
    case "PENDING_VERIFICATION":
    case "UNDER_VERIFICATION":
    case "VERIFICATION_PENDING":
    case "SUBMITTED":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1.5 ${className || ""}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span>{label || "Verification Pending"}</span>
        </Badge>
      );
    case "FAILED":
    case "REJECTED":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-destructive/15 text-destructive border-destructive/30 gap-1 ${className || ""}`}
        >
          <span>✕</span>
          <span>{label || (upper === "REJECTED" ? "Rejected" : "Verification Failed")}</span>
        </Badge>
      );
    case "PARTIALLY_PAID":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-cyan-950/30 text-cyan-400 border-cyan-800/50 ${className || ""}`}
        >
          {label || "Partially Paid"}
        </Badge>
      );
    case "DUE":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-secondary text-foreground border-border/80 ${className || ""}`}
        >
          {label || "Due Today"}
        </Badge>
      );
    case "OVERDUE":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-destructive/15 text-destructive border-destructive/30 ${className || ""}`}
        >
          {label || "Overdue"}
        </Badge>
      );
    case "SCHEDULED":
    case "ACTIVE":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-blue-950/30 text-blue-400 border-blue-800/50 ${className || ""}`}
        >
          {label || (upper === "ACTIVE" ? "Active" : "Scheduled")}
        </Badge>
      );
    case "PAUSED":
    case "DRAFT":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-zinc-900/60 text-zinc-400 border-zinc-700/50 ${className || ""}`}
        >
          {label || (upper === "DRAFT" ? "Draft" : "Paused")}
        </Badge>
      );
    case "CANCELLED":
    case "WAIVED":
      return (
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium bg-zinc-900/60 text-zinc-500 border-zinc-800/60 line-through ${className || ""}`}
        >
          {label || status}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={`font-mono text-[11px] ${className || ""}`}>
          {label || status}
        </Badge>
      );
  }
}
