import {
  FileCheck,
  CreditCard,
  Video,
  FolderKanban,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Clock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Notification } from "./types";

export type NotificationPriority = "URGENT" | "ACTION_REQUIRED" | "INFO";
export type NotificationCategory =
  | "DELIVERABLE"
  | "PAYMENT"
  | "MEETING"
  | "PROJECT"
  | "REQUEST"
  | "SYSTEM";

export interface ParsedNotificationDetails {
  priority: NotificationPriority;
  category: NotificationCategory;
  icon: LucideIcon;
  actionLabel: string;
  badgeLabel: string;
  badgeColorClass: string;
}

/**
 * Determine the priority level of a notification based on its type and content.
 */
export function getNotificationPriority(
  type: string,
  title: string = "",
  message: string = ""
): NotificationPriority {
  const upperType = type.toUpperCase();
  const lowerTitle = title.toLowerCase();
  const lowerMsg = message.toLowerCase();

  // URGENT rules
  if (
    upperType === "PAYMENT_OVERDUE" ||
    upperType === "PAYMENT_FAILED" ||
    lowerTitle.includes("overdue") ||
    lowerTitle.includes("rejected") ||
    lowerTitle.includes("failed") ||
    lowerMsg.includes("overdue by")
  ) {
    return "URGENT";
  }

  // ACTION_REQUIRED rules
  if (
    upperType === "DELIVERABLE_SUBMITTED" ||
    upperType === "DELIVERABLE_READY" ||
    upperType === "PAYMENT_DUE" ||
    upperType === "PAYMENT_DUE_TODAY" ||
    upperType === "MEETING_SCHEDULED" ||
    upperType === "MEETING_REMINDER" ||
    upperType === "REQUEST_RESPONSE" ||
    lowerTitle.includes("ready for review") ||
    lowerTitle.includes("due soon") ||
    lowerTitle.includes("due today") ||
    lowerTitle.includes("starting soon")
  ) {
    return "ACTION_REQUIRED";
  }

  // Default to INFO
  return "INFO";
}

/**
 * Determine the functional category of a notification.
 */
export function getNotificationCategory(type: string): NotificationCategory {
  const upper = type.toUpperCase();

  if (upper.startsWith("DELIVERABLE") || upper.includes("CHANGES_REQUESTED")) {
    return "DELIVERABLE";
  }
  if (upper.startsWith("PAYMENT") || upper.startsWith("INVOICE")) {
    return "PAYMENT";
  }
  if (upper.startsWith("MEETING")) {
    return "MEETING";
  }
  if (upper.startsWith("PROJECT") || upper.startsWith("MILESTONE")) {
    return "PROJECT";
  }
  if (upper.startsWith("REQUEST")) {
    return "REQUEST";
  }
  return "SYSTEM";
}

/**
 * Resolve UI metadata for a notification.
 */
export function parseNotificationDetails(
  notification: Notification
): ParsedNotificationDetails {
  const priority = getNotificationPriority(
    notification.type,
    notification.title,
    notification.message
  );
  const category = getNotificationCategory(notification.type);

  // Icon mapping
  let icon: LucideIcon = Bell;
  if (category === "DELIVERABLE") icon = FileCheck;
  else if (category === "PAYMENT") icon = CreditCard;
  else if (category === "MEETING") icon = Video;
  else if (category === "PROJECT") icon = FolderKanban;
  else if (category === "REQUEST") icon = MessageSquare;
  else if (priority === "URGENT") icon = AlertTriangle;

  // Action Button Label mapping
  let actionLabel = "View Details";
  const upper = notification.type.toUpperCase();

  if (category === "DELIVERABLE") {
    actionLabel = priority === "ACTION_REQUIRED" ? "Review Deliverable" : "View Deliverable";
  } else if (category === "PAYMENT") {
    if (priority === "URGENT" || upper.includes("DUE")) {
      actionLabel = "Pay Now";
    } else if (upper.includes("RECEIVED") || upper.includes("CONFIRMED")) {
      actionLabel = "View Receipt";
    } else {
      actionLabel = "View Payment";
    }
  } else if (category === "MEETING") {
    actionLabel = "View Meeting";
  } else if (category === "PROJECT") {
    actionLabel = "View Project";
  } else if (category === "REQUEST") {
    actionLabel = "View Request";
  }

  // Priority Badge Label & Colors
  let badgeLabel = "Info";
  let badgeColorClass = "bg-secondary text-muted-foreground border-border/50";

  if (priority === "URGENT") {
    badgeLabel = "Urgent";
    badgeColorClass = "bg-destructive/15 text-destructive border-destructive/30 font-semibold";
  } else if (priority === "ACTION_REQUIRED") {
    badgeLabel = "Action Required";
    badgeColorClass = "bg-primary/15 text-primary border-primary/30 font-semibold";
  }

  return {
    priority,
    category,
    icon,
    actionLabel,
    badgeLabel,
    badgeColorClass,
  };
}

/**
 * Format relative time for human reading.
 */
export function formatNotificationTime(isoString: string): string {
  try {
    const timestamp = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - timestamp) / 1000);

    if (diffSec < 45) return "Just now";
    if (diffSec < 3600) {
      const mins = Math.max(1, Math.floor(diffSec / 60));
      return `${mins}m ago`;
    }
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours}h ago`;
    }
    if (diffSec < 172800) {
      return "Yesterday";
    }
    if (diffSec < 604800) {
      const days = Math.floor(diffSec / 86400);
      return `${days}d ago`;
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
