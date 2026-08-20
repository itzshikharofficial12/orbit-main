"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseNotificationDetails, formatNotificationTime } from "../utils";
import type { Notification } from "../types";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClosePopover?: () => void;
  showActionButtons?: boolean;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClosePopover,
  showActionButtons = true,
}: NotificationItemProps) {
  const router = useRouter();
  const { priority, icon: Icon, actionLabel, badgeLabel, badgeColorClass } =
    parseNotificationDetails(notification);

  const isUnread = !notification.is_read;

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnread) {
      onMarkAsRead(notification.id);
    }
    if (onClosePopover) {
      onClosePopover();
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleContainerClick = () => {
    if (isUnread) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      if (onClosePopover) onClosePopover();
      router.push(notification.link);
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleContainerClick();
        }
      }}
      className={`p-3 rounded-lg text-left transition-colors cursor-pointer group border ${
        isUnread
          ? priority === "URGENT"
            ? "bg-destructive/10 hover:bg-destructive/15 border-destructive/30 text-foreground"
            : priority === "ACTION_REQUIRED"
            ? "bg-primary/10 hover:bg-primary/15 border-primary/25 text-foreground"
            : "bg-secondary/40 hover:bg-secondary/60 border-border/70 text-foreground"
          : "bg-transparent hover:bg-secondary/20 border-transparent text-muted-foreground"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <div
          className={`h-7 w-7 rounded-md shrink-0 flex items-center justify-center border mt-0.5 ${
            isUnread
              ? priority === "URGENT"
                ? "bg-destructive/20 text-destructive border-destructive/40"
                : priority === "ACTION_REQUIRED"
                ? "bg-primary/20 text-primary border-primary/40"
                : "bg-secondary text-foreground border-border/60"
              : "bg-secondary/40 text-muted-foreground border-border/30"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>

        {/* Content */}
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {isUnread && (
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    priority === "URGENT" ? "bg-destructive" : "bg-primary"
                  }`}
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

            {priority !== "INFO" && (
              <span
                className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border shrink-0 ${badgeColorClass}`}
              >
                {badgeLabel}
              </span>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-mono text-muted-foreground/70">
              {formatNotificationTime(notification.created_at)}
            </span>

            {showActionButtons && notification.link && (
              <Button
                type="button"
                size="sm"
                variant={isUnread && priority !== "INFO" ? "default" : "secondary"}
                onClick={handleNavigate}
                className="h-6 text-[10px] px-2 py-0 font-medium gap-1 cursor-pointer"
              >
                <span>{actionLabel}</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
