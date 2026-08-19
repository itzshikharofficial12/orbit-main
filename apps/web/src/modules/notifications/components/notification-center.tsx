"use client";

import * as React from "react";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { useNotifications } from "../hooks/use-notifications";
import { NotificationItem } from "./notification-item";
import { NotificationSoundToggle } from "./notification-sound-toggle";
import { Button } from "@/components/ui/button";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    isSoundEnabled,
    toggleSound,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications();

  function handleToggleOpen() {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      refresh();
    }
  }

  // Close popover when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close popover on escape key
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="relative inline-flex items-center justify-center h-9 px-2.5 rounded-md border border-border/60 bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-primary text-primary-foreground leading-none min-w-[18px] text-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border/80 bg-card shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[480px]"
        >
          {/* Header */}
          <div className="p-3.5 px-4 border-b border-border/40 flex items-center justify-between bg-secondary/30">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground font-mono">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  ({unreadCount} unread)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <NotificationSoundToggle
                isSoundEnabled={isSoundEnabled}
                onToggle={toggleSound}
              />

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                >
                  <CheckCheck className="h-3 w-3" />
                  <span>Mark all as read</span>
                </Button>
              )}
            </div>
          </div>

          {/* Notification List Body */}
          <div className="overflow-y-auto p-2 space-y-1 divide-y divide-border/20 flex-1">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-2">
                <div className="h-8 w-8 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground border border-border/40">
                  <Inbox className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-foreground">
                    No new notifications
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    You are all caught up.
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onClosePopover={() => setIsOpen(false)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
