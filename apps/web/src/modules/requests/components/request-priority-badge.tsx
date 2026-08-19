import * as React from "react";
import type { ClientRequestPriority } from "../types";

interface RequestPriorityBadgeProps {
  priority: ClientRequestPriority;
  className?: string;
}

export function RequestPriorityBadge({ priority, className }: RequestPriorityBadgeProps) {
  switch (priority) {
    case "HIGH":
      return (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-red-950/40 text-red-400 border border-red-800/40 ${
            className || ""
          }`}
        >
          High
        </span>
      );
    case "MEDIUM":
      return (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700/60 ${
            className || ""
          }`}
        >
          Medium
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
