import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium tracking-wide transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "border-border text-foreground bg-secondary/40",
        role: "border-border/60 bg-muted/60 text-muted-foreground text-[11px] uppercase tracking-wider font-mono",
        // Client Status Badges
        active:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-normal text-xs",
        paused:
          "border-amber-500/20 bg-amber-500/10 text-amber-400 font-normal text-xs",
        completed:
          "border-blue-500/20 bg-blue-500/10 text-blue-400 font-normal text-xs",
        archived:
          "border-zinc-500/20 bg-zinc-500/10 text-zinc-400 font-normal text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
