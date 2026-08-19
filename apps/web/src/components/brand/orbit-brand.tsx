import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface OrbitBrandProps {
  size?: "sm" | "default" | "lg" | "xl";
  href?: string;
  className?: string;
  orbitClassName?: string;
  byClassName?: string;
  onClick?: () => void;
}

export function OrbitBrand({
  size = "default",
  href,
  className,
  orbitClassName,
  byClassName,
  onClick,
}: OrbitBrandProps) {
  const sizeConfig = {
    sm: {
      orbit: "text-sm font-bold tracking-wider",
      by: "text-[11px] font-normal tracking-normal text-muted-foreground",
      gap: "gap-1.5",
    },
    default: {
      orbit: "text-base font-bold tracking-wider",
      by: "text-xs font-normal tracking-normal text-muted-foreground",
      gap: "gap-2",
    },
    lg: {
      orbit: "text-xl font-bold tracking-wider",
      by: "text-sm font-normal tracking-normal text-muted-foreground",
      gap: "gap-2.5",
    },
    xl: {
      orbit: "text-2xl font-bold tracking-wider",
      by: "text-sm font-normal tracking-normal text-muted-foreground",
      gap: "gap-3",
    },
  };

  const config = sizeConfig[size] || sizeConfig.default;

  const content = (
    <span
      className={cn(
        "inline-flex items-baseline select-none",
        config.gap,
        className
      )}
    >
      <span
        className={cn(
          "uppercase text-foreground transition-colors",
          config.orbit,
          orbitClassName
        )}
      >
        ORBIT
      </span>
      <span
        className={cn(
          "text-muted-foreground whitespace-nowrap",
          config.by,
          byClassName
        )}
      >
        by Celestia Studios
      </span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="inline-flex items-baseline focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm group"
        aria-label="ORBIT by Celestia Studios"
      >
        {content}
      </Link>
    );
  }

  return content;
}
