"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Notification } from "../types";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClosePopover?: () => void;
}

function formatRelativeTime(isoString: string): string {
  try {
    const timestamp = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - timestamp) / 1000);

    if (diffSec < 45) return "Just now";
    if (diffSec < 3600) {
      const mins = Math.max(1, Math.floor(diffSec / 60));
      return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
    }
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }
    if (diffSec < 604800) {
      const days = Math.floor(diffSec / 86400);
      return days === 1 ? "Yesterday" : `${days} days ago`;
    }

    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClosePopover,
}: NotificationItemProps) {
  const router = useRouter();

  function handleClick() {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (onClosePopover) {
      onClosePopover();
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  const isUnread = !notification.is_read;

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`p-3.5 rounded-lg text-left transition-colors cursor-pointer group border ${
        isUnread
          ? "bg-secondary/35 hover:bg-secondary/50 border-border/70 text-foreground"
          : "bg-transparent hover:bg-secondary/20 border-transparent text-muted-foreground"
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isUnread && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                aria-label="Unread notification"
              />
            )}
            <h4
              className={`text-xs leading-snug truncate ${
                isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"
              }`}
            >
              {notification.title}
            </h4>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
            {notification.message}
          </p>

          <span className="text-[10px] font-mono text-muted-foreground/70 block pt-0.5">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
