"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Check,
  Inbox,
  ArrowRight,
  Filter,
  Volume2,
  VolumeX,
  RotateCw,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "../hooks/use-notifications";
import { NotificationSoundToggle } from "./notification-sound-toggle";
import {
  parseNotificationDetails,
  formatNotificationTime,
  type NotificationPriority,
} from "../utils";
import type { Notification } from "../types";

export function ClientNotificationsPageView() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = React.useState<"ALL" | "UNREAD" | "ACTION_REQUIRED">("ALL");

  const {
    notifications,
    unreadCount,
    isLoading,
    isSoundEnabled,
    toggleSound,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications();

  // Categorize notifications
  const parsedItems = React.useMemo(() => {
    return notifications.map((n) => ({
      item: n,
      details: parseNotificationDetails(n),
    }));
  }, [notifications]);

  const actionRequiredCount = React.useMemo(() => {
    return parsedItems.filter(
      (p) => !p.item.is_read && (p.details.priority === "ACTION_REQUIRED" || p.details.priority === "URGENT")
    ).length;
  }, [parsedItems]);

  const filteredItems = React.useMemo(() => {
    if (activeFilter === "UNREAD") {
      return parsedItems.filter((p) => !p.item.is_read);
    }
    if (activeFilter === "ACTION_REQUIRED") {
      return parsedItems.filter(
        (p) => p.details.priority === "ACTION_REQUIRED" || p.details.priority === "URGENT"
      );
    }
    return parsedItems;
  }, [parsedItems, activeFilter]);

  const handleActionClick = (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Toolbar: Filters & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        {/* Segmented Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-secondary/40 border border-border/40 w-fit">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeFilter === "ALL"
                ? "bg-card text-foreground shadow-sm border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>All</span>
            <span className="font-mono text-[10px] opacity-70">({notifications.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("UNREAD")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeFilter === "UNREAD"
                ? "bg-card text-foreground shadow-sm border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-semibold">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("ACTION_REQUIRED")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeFilter === "ACTION_REQUIRED"
                ? "bg-card text-foreground shadow-sm border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Action Required</span>
            {actionRequiredCount > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-destructive/20 text-destructive font-semibold">
                {actionRequiredCount}
              </span>
            )}
          </button>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <NotificationSoundToggle
            isSoundEnabled={isSoundEnabled}
            onToggle={toggleSound}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            className="h-8 text-xs gap-1 border-border/80 hover:bg-secondary"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 text-xs gap-1.5 border-border/80 hover:bg-secondary"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-12 text-center space-y-3">
          <div className="h-10 w-10 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground border border-border/40 mx-auto">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">You&apos;re all caught up.</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              New updates and actionable requests from your Celestia Studios workspace will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map(({ item, details }) => {
            const { priority, icon: Icon, actionLabel, badgeLabel, badgeColorClass } = details;
            const isUnread = !item.is_read;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isUnread) markAsRead(item.id);
                  if (item.link) router.push(item.link);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (isUnread) markAsRead(item.id);
                    if (item.link) router.push(item.link);
                  }
                }}
                className={`p-4 sm:p-5 rounded-xl border transition-colors cursor-pointer group space-y-3 ${
                  isUnread
                    ? priority === "URGENT"
                      ? "bg-destructive/10 hover:bg-destructive/15 border-destructive/40 shadow-sm"
                      : priority === "ACTION_REQUIRED"
                      ? "bg-primary/10 hover:bg-primary/15 border-primary/30 shadow-sm"
                      : "bg-card hover:bg-secondary/30 border-border/90 shadow-sm"
                    : "bg-card/60 hover:bg-card border-border/60 opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Category Icon */}
                    <div
                      className={`h-9 w-9 rounded-lg shrink-0 flex items-center justify-center border mt-0.5 ${
                        isUnread
                          ? priority === "URGENT"
                            ? "bg-destructive/20 text-destructive border-destructive/40"
                            : priority === "ACTION_REQUIRED"
                            ? "bg-primary/20 text-primary border-primary/40"
                            : "bg-secondary text-foreground border-border/70"
                          : "bg-secondary/40 text-muted-foreground border-border/40"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Notification Texts */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {isUnread && (
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              priority === "URGENT" ? "bg-destructive" : "bg-primary"
                            }`}
                          />
                        )}
                        <h4
                          className={`text-sm tracking-tight ${
                            isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                          }`}
                        >
                          {item.title}
                        </h4>

                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${badgeColorClass}`}
                        >
                          {badgeLabel}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.message}
                      </p>

                      <span className="text-[11px] font-mono text-muted-foreground/70 block pt-1">
                        {formatNotificationTime(item.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0.5 border-t sm:border-t-0 border-border/30 justify-end">
                    {item.link && (
                      <Button
                        size="sm"
                        variant={isUnread && priority !== "INFO" ? "default" : "secondary"}
                        onClick={(e) => handleActionClick(e, item)}
                        className="h-8 text-xs px-3 gap-1.5 font-medium shadow-sm cursor-pointer"
                      >
                        <span>{actionLabel}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}

                    {isUnread && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(item.id);
                        }}
                        className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Check className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Mark read</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
