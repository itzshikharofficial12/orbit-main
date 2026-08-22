"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Inbox,
  Video,
  CreditCard,
  MoreHorizontal,
  Bell,
  Settings,
  LogOut,
  X,
  User,
  CheckCircle2,
} from "lucide-react";
import type { Profile } from "@/lib/supabase/types";
import { OrbitBrand } from "@/components/brand/orbit-brand";
import { OrbitAvatar } from "@/components/ui/orbit-avatar";
import { NotificationCenter } from "@/modules/notifications/components/notification-center";
import { signOutAction } from "@/modules/auth/actions";
import { cn } from "@/lib/utils";

interface MobileClientNavProps {
  profile: Profile | null;
}

import Image from "next/image";

/**
 * Top Bar for Mobile Client Portal (< 768px).
 * Clean, native SaaS header: Left has Orbit logo + "ORBIT", Right has Notification + Avatar.
 */
export function MobileClientTopBar({ profile }: MobileClientNavProps) {
  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ""}`
    : profile?.email || "User";

  return (
    <header className="md:hidden sticky top-0 z-30 w-full border-b border-border/50 bg-background/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 items-center justify-between px-4.5 sm:px-5">
        {/* Left: Orbit Logo Symbol + ORBIT Wordmark */}
        <Link
          href="/client"
          className="flex items-center gap-2.5 group focus:outline-none select-none"
          aria-label="Orbit Client Portal"
        >
          <div className="relative h-7.5 w-7.5 shrink-0 flex items-center justify-center">
            <Image
              src="/brand/orbit-logo-transparent.png"
              alt="Orbit Logo"
              width={30}
              height={30}
              className="h-7.5 w-7.5 object-contain transition-transform group-hover:scale-105"
              priority
            />
          </div>
          <span className="text-[18px] font-bold tracking-wider text-foreground uppercase">
            ORBIT
          </span>
        </Link>

        {/* Right: Notifications Button + User Avatar */}
        <div className="flex items-center gap-2.5">
          <NotificationCenter
            triggerClassName="h-10 px-2.5 rounded-xl border border-border/60 bg-secondary/40 hover:bg-secondary text-foreground transition-all"
          />
          <Link
            href="/client/settings"
            className="flex items-center justify-center h-10 w-10 rounded-full ring-1 ring-border/80 hover:ring-primary transition-all p-0.5"
            aria-label="Account Settings"
          >
            <OrbitAvatar
              src={profile?.avatar_url}
              name={displayName}
              size="sm"
              className="h-9 w-9 text-xs"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}

/**
 * Bottom Navigation for Mobile Client Portal (< 768px).
 * 5 primary touch items: Overview, Requests, Meetings, Payments, More.
 * Respects safe-area-inset-bottom and provides 44px+ touch targets.
 */
export function MobileClientBottomNav({ profile }: MobileClientNavProps) {
  const pathname = usePathname();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = React.useState(false);

  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ""}`
    : profile?.email || "User";

  const navTabs = [
    {
      id: "overview",
      label: "Overview",
      href: "/client",
      icon: LayoutGrid,
      isActive:
        pathname === "/client" ||
        (pathname.startsWith("/client/projects") && !pathname.startsWith("/client/requests")),
    },
    {
      id: "requests",
      label: "Requests",
      href: "/client/requests",
      icon: Inbox,
      isActive: pathname.startsWith("/client/requests"),
    },
    {
      id: "meetings",
      label: "Meetings",
      href: "/client/meetings",
      icon: Video,
      isActive: pathname.startsWith("/client/meetings"),
    },
    {
      id: "payments",
      label: "Payments",
      href: "/client/payments",
      icon: CreditCard,
      isActive: pathname.startsWith("/client/payments"),
    },
    {
      id: "more",
      label: "More",
      href: "#more",
      icon: MoreHorizontal,
      isActive:
        pathname.startsWith("/client/settings") ||
        pathname.startsWith("/client/notifications"),
      isAction: true,
    },
  ];

  return (
    <>
      {/* 1. STICKY BOTTOM BAR */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-lg"
        aria-label="Mobile Navigation"
      >
        <div className="flex h-15 items-center justify-around px-1">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.isActive;

            if (tab.isAction) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setIsMoreSheetOpen(true)}
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center py-1 min-h-[44px] transition-colors relative cursor-pointer",
                    active
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-label="Open more menu"
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {active && (
                      <span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight mt-1">{tab.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center py-1 min-h-[44px] transition-colors relative",
                  active
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {active && (
                    <span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-[10px] tracking-tight mt-1">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 2. MORE SHEET / DRAWER */}
      {isMoreSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-150"
            onClick={() => setIsMoreSheetOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full rounded-t-2xl border-t border-border/80 bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl z-50 animate-in slide-in-from-bottom duration-200 space-y-4">
            {/* Grab handle */}
            <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />

            {/* Header / User summary */}
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <div className="flex items-center gap-3 min-w-0">
                <OrbitAvatar
                  src={profile?.avatar_url}
                  name={displayName}
                  size="md"
                  className="ring-1 ring-border/80"
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {displayName}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile?.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMoreSheetOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Menu Links */}
            <div className="space-y-1.5">
              <Link
                href="/client/notifications"
                onClick={() => setIsMoreSheetOpen(false)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-colors",
                  pathname.startsWith("/client/notifications")
                    ? "bg-secondary text-foreground border-border/80"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-primary" />
                  <span>Notifications</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">View alerts</span>
              </Link>

              <Link
                href="/client/settings"
                onClick={() => setIsMoreSheetOpen(false)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-colors",
                  pathname.startsWith("/client/settings")
                    ? "bg-secondary text-foreground border-border/80"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-4 w-4 text-primary" />
                  <span>Profile & Security</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">Settings</span>
              </Link>
            </div>

            {/* Sign out */}
            <div className="pt-2 border-t border-border/50">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 p-3 text-xs font-semibold text-muted-foreground hover:text-destructive rounded-xl border border-border/50 hover:border-destructive/30 hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
