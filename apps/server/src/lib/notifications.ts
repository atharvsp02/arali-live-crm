import type { Notification } from "@prisma/client";
import type {
  NotificationMetadata,
  NotificationPayload,
} from "@live-crm/shared";

export function toNotificationPayload(
  notification: Notification,
): NotificationPayload {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    metadata: notification.metadata as unknown as NotificationMetadata,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export function reminderDeduplicationKey(
  assignmentType: string,
  assignmentId: string,
) {
  return `follow-up:${assignmentType}:${assignmentId}`;
}
