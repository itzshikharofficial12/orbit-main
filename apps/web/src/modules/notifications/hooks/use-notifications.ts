"use client";

import * as React from "react";
import {
  getNotificationsFeedAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "../actions";
import { useNotificationSound } from "./use-notification-sound";
import type { Notification } from "../types";

export function useNotifications() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const { isSoundEnabled, toggleSound, playSound } = useNotificationSound();

  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialLoadRef = React.useRef<boolean>(true);

  const fetchFeed = React.useCallback(async () => {
    try {
      const feed = await getNotificationsFeedAction();
      const items = feed.notifications;
      const count = feed.unreadCount;

      setNotifications(items);
      setUnreadCount(count);

      // Check if there are genuinely new unread notifications that were not seen before
      if (isInitialLoadRef.current) {
        // Record existing notification IDs without playing sound
        items.forEach((item) => seenIdsRef.current.add(item.id));
        isInitialLoadRef.current = false;
      } else {
        const unreadItems = items.filter((item) => !item.is_read);
        const hasNewUnread = unreadItems.some((item) => !seenIdsRef.current.has(item.id));

        if (hasNewUnread) {
          playSound();
        }

        items.forEach((item) => seenIdsRef.current.add(item.id));
      }
    } catch {
      // ignore fetch failures during polling
    } finally {
      setIsLoading(false);
    }
  }, [playSound]);

  // Initial load
  React.useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Background polling every 10 seconds and on tab focus
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchFeed();
    }, 10000);

    function onFocus() {
      fetchFeed();
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [fetchFeed]);

  // Optimistic Mark Single as Read
  const markAsRead = React.useCallback(
    async (notificationId: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await markNotificationAsReadAction(notificationId);
      } catch {
        // Re-sync on failure
        fetchFeed();
      }
    },
    [fetchFeed]
  );

  // Optimistic Mark All as Read
  const markAllAsRead = React.useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsAsReadAction();
    } catch {
      fetchFeed();
    }
  }, [fetchFeed]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isSoundEnabled,
    toggleSound,
    markAsRead,
    markAllAsRead,
    refresh: fetchFeed,
  };
}
