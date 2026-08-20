"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface OrbitAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
}

const sizeClasses = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-lg",
  "2xl": "h-24 w-24 text-2xl font-medium",
};

export function OrbitAvatar({
  src,
  alt,
  name,
  size = "md",
  className,
  ...props
}: OrbitAvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  // Reset image error state when src changes
  React.useEffect(() => {
    setImageError(false);
  }, [src]);

  // Compute initials from name or email
  const initials = React.useMemo(() => {
    if (!name) return "U";
    const cleaned = name.trim();
    if (!cleaned) return "U";
    const parts = cleaned.split(/[\s_-]+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  const hasValidImage = Boolean(src && !imageError);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full border border-border/70 bg-secondary/80 font-mono text-muted-foreground select-none",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {hasValidImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src!}
          alt={alt || name || "User Avatar"}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-semibold tracking-wider text-foreground/80">
          {initials}
        </span>
      )}
    </div>
  );
}
