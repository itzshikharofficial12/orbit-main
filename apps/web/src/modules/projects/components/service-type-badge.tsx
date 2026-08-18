import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { ServiceType } from "../types";
import { cn } from "@/lib/utils";

interface ServiceTypeBadgeProps {
  serviceType: ServiceType;
  className?: string;
}

export const serviceTypeLabels: Record<ServiceType, string> = {
  BRAND_FOUNDATION: "Brand Foundation",
  SAAS_WEBSITE: "SaaS Website",
  GROWTH_ENGINE: "Growth Engine",
  AI_OPERATIONS: "AI Operations",
};

export function ServiceTypeBadge({ serviceType, className }: ServiceTypeBadgeProps) {
  const label = serviceTypeLabels[serviceType] || serviceType;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal text-xs text-muted-foreground bg-secondary/30 border-border/70 select-none whitespace-nowrap",
        className
      )}
    >
      {label}
    </Badge>
  );
}
