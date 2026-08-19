import type {
  Notification as SupabaseNotification,
  NotificationInsert,
  NotificationUpdate,
} from "@/lib/supabase/types";

export type Notification = SupabaseNotification;
export type { NotificationInsert, NotificationUpdate };

export type NotificationType =
  | "DELIVERABLE_SUBMITTED"
  | "DELIVERABLE_APPROVED"
  | "CHANGES_REQUESTED"
  | "REQUEST_RESOLVED"
  | "PROJECT_STATUS_CHANGED"
  | "MILESTONE_COMPLETED"
  | "MEETING_SCHEDULED"
  | "MEETING_UPDATED"
  | "PAYMENT_CREATED"
  | "PAYMENT_DUE"
  | "PAYMENT_RECEIVED"
  | string;

export interface SendNotificationPayload {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}

export interface ClientNotificationTarget {
  clientId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}

export interface AdminNotificationTarget {
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  excludeProfileId?: string;
}

export interface NotificationActionResult {
  success: boolean;
  error?: string;
}
