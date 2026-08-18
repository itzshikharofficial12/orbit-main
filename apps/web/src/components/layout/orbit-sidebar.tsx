"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, FolderKanban, LogOut, Menu, X } from "lucide-react";
import type { Profile } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import { signOutAction } from "@/modules/auth/actions";
import { cn } from "@/lib/utils";

interface OrbitSidebarProps {
  profile: Profile | null;
  basePath: "/hq" | "/client";
}

export function OrbitSidebar({ profile, basePath }: OrbitSidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ""}`
    : profile?.email || "User";

  const isSuperAdmin = profile?.role === "SUPER_ADMIN";

  // Only render navigation items for currently implemented modules
  const navItems = [
    {
      label: "Overview",
      href: basePath,
      icon: LayoutGrid,
      isActive: pathname === basePath,
    },
    ...(isSuperAdmin && basePath === "/hq"
      ? [
          {
            label: "Clients",
            href: "/hq/clients",
            icon: Users,
            isActive: pathname.startsWith("/hq/clients"),
          },
          {
            label: "Projects",
            href: "/hq/projects",
            icon: FolderKanban,
            isActive: pathname.startsWith("/hq/projects"),
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-md border border-border bg-sidebar text-sidebar-foreground shadow-md hover:bg-sidebar-accent"
          aria-label="Toggle navigation menu"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "w-64 flex-shrink-0 flex flex-col justify-between border-r border-border/70 bg-sidebar text-sidebar-foreground z-40 transition-transform duration-200 ease-in-out",
          "fixed lg:static inset-y-0 left-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Top: Brand Header & Navigation */}
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="p-6 pb-5 border-b border-border/40">
            <Link
              href={basePath}
              className="flex flex-col group focus:outline-none"
              onClick={() => setIsMobileOpen(false)}
            >
              <span className="text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-white">
                Orbit
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
                by Celestia Studios
              </span>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 py-5 space-y-1.5" aria-label="Main Navigation">
            <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground/70 font-mono">
              Workspace
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                    item.isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border border-border/50 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 border border-transparent"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      item.isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Profile & Sign Out */}
        <div className="p-4 border-t border-border/50 bg-sidebar/90">
          <div className="flex flex-col space-y-3.5">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {displayName}
                </span>
                <Badge variant="role">
                  {profile?.role === "SUPER_ADMIN" ? "HQ" : "Client"}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </span>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md border border-border/40 hover:bg-sidebar-accent transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
