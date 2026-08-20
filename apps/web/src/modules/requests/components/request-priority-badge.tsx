import * as React from "react";
import type { ClientRequestPriority } from "../types";

interface RequestPriorityBadgeProps {
  priority: ClientRequestPriority | string;
  className?: string;
}

export function RequestPriorityBadge({ priority, className }: RequestPriorityBadgeProps) {
  switch (priority) {
    case "URGENT":
      return (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-red-950/60 text-red-400 border border-red-800/60 ${
            className || ""
          }`}
        >
          Urgent
        </span>
      );
    case "HIGH":
      return (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-amber-950/40 text-amber-400 border border-amber-800/40 ${
            className || ""
          }`}
        >
          High
        </span>
      );
    case "MEDIUM":
    case "NORMAL":
      return (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700/60 ${
            className || ""
          }`}
        >
          Normal
        </span>
      );
    case "LOW":
    default:
      return (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-secondary/50 text-zinc-400 border border-border/40 ${
            className || ""
          }`}
        >
          Low
        </span>
      );
  }
}
