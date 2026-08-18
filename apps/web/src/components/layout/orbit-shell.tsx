import * as React from "react";
import type { Profile } from "@/lib/supabase/types";
import { OrbitSidebar } from "./orbit-sidebar";

interface OrbitShellProps {
  profile: Profile | null;
  basePath: "/hq" | "/client";
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function OrbitShell({
  profile,
  basePath,
  title,
  description,
  actions,
  children,
}: OrbitShellProps) {
  const firstName = profile?.first_name || "there";
  const defaultTitle = `Namaste, ${firstName}`;
  const defaultDescription =
    basePath === "/hq"
      ? "Celestia Studios Headquarters"
      : "Celestia Studios Client Portal";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <OrbitSidebar profile={profile} basePath={basePath} />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="px-6 sm:px-10 py-7 border-b border-border/60 bg-background/40">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                {title || defaultTitle}
              </h1>
              <p className="text-sm text-muted-foreground">
                {description || defaultDescription}
              </p>
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </header>

        {/* Content View */}
        <div className="flex-1 p-6 sm:p-10">
          <div className="max-w-7xl mx-auto space-y-8 w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
