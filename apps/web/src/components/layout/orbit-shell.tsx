import * as React from "react";
import type { Profile } from "@/lib/supabase/types";
import { OrbitSidebar } from "./orbit-sidebar";
import { NotificationCenter } from "@/modules/notifications/components/notification-center";
import { MobileClientTopBar, MobileClientBottomNav } from "./mobile-client-nav";

interface OrbitShellProps {
  profile: Profile | null;
  basePath: "/hq" | "/client";
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  hideHeader?: boolean;
  children: React.ReactNode;
}

export function OrbitShell({
  profile,
  basePath,
  title,
  description,
  actions,
  hideHeader = false,
  children,
}: OrbitShellProps) {
  const firstName = profile?.first_name || "there";
  const defaultTitle = `Namaste, ${firstName}`;
  const defaultDescription =
    basePath === "/hq"
      ? "Celestia Studios Headquarters"
      : "Celestia Studios Client Portal";

  const isClient = basePath === "/client";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar (Desktop on >= md for client, >= lg for HQ) */}
      <OrbitSidebar profile={profile} basePath={basePath} />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Top Bar for Client Portal (< 768px) */}
        {isClient && <MobileClientTopBar profile={profile} />}

        {/* Top Header */}
        {!hideHeader && (
          <header className="px-4 sm:px-6 md:px-10 py-3.5 sm:py-7 border-b border-border/60 bg-background/40">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold sm:font-semibold tracking-tight text-foreground truncate">
                  {title || defaultTitle}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 sm:line-clamp-none">
                  {isClient ? "Here's your workspace overview." : (description || defaultDescription)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {actions}
                <div className={isClient ? "hidden md:flex items-center" : "flex items-center"}>
                  <NotificationCenter />
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Content View */}
        <div className={`flex-1 p-4 sm:p-6 md:p-10 ${isClient ? "pb-24 md:pb-10" : ""}`}>
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 w-full min-w-0">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation for Client Portal (< 768px) */}
      {isClient && <MobileClientBottomNav profile={profile} />}
    </div>
  );
}
