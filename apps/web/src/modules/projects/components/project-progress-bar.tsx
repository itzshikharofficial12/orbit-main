import * as React from "react";
import { cn } from "@/lib/utils";

interface ProjectProgressBarProps {
  progress: number;
  milestoneCount: number;
  completedMilestoneCount: number;
  showLabels?: boolean;
  className?: string;
}

export function ProjectProgressBar({
  progress,
  milestoneCount,
  completedMilestoneCount,
  showLabels = true,
  className,
}: ProjectProgressBarProps) {
  if (milestoneCount === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <span className="font-mono text-[11px] text-muted-foreground/70">No milestones</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5 min-w-[120px]", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono font-medium text-foreground">{progress}%</span>
        {showLabels && (
          <span className="text-[11px] text-muted-foreground font-mono">
            {completedMilestoneCount}/{milestoneCount}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
        <div
          className={cn(
            "h-full transition-all duration-300 rounded-full",
            progress === 100 ? "bg-emerald-500" : "bg-primary"
          )}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}
