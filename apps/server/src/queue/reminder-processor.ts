import { Prisma } from "@prisma/client";
import {
  formatReminderMessage,
  type AssignmentReminderJob,
  type NotificationMetadata,
} from "@live-crm/shared";
import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import {
  reminderDeduplicationKey,
  toNotificationPayload,
} from "../lib/notifications.js";
import { publishNotification } from "../realtime/publisher.js";

export async function processReminder(data: AssignmentReminderJob) {
  const assignment =
    data.assignmentType === "COMPANY"
      ? await prisma.companyAssignment.findFirst({
          where: { id: data.assignmentId, userId: data.userId },
          select: { id: true },
        })
      : await prisma.contactAssignment.findFirst({
          where: { id: data.assignmentId, userId: data.userId },
          select: { id: true },
        });

  if (!assignment) {
    logger.info(
      { assignmentId: data.assignmentId, assignmentType: data.assignmentType },
      "Reminder skipped because assignment no longer exists",
    );
    return { created: false, reason: "assignment-missing" as const };
  }

  const deduplicationKey = reminderDeduplicationKey(
    data.assignmentType,
    data.assignmentId,
  );
  const metadata: NotificationMetadata = {
    entityType: data.assignmentType,
    entityId: data.entityId,
    entityName: data.entityName,
    assignmentRole: data.assignmentRole,
    assignmentId: data.assignmentId,
    assignedByUserId: data.assignedByUserId,
    deduplicationKey,
  };
  let notification;

  try {
    notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: "FOLLOW_UP_REMINDER",
        title: "Assignment reminder",
        message: formatReminderMessage(data.entityName),
        metadata: metadata as unknown as Prisma.InputJsonValue,
        deduplicationKey,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      logger.info(
        { assignmentId: data.assignmentId, deduplicationKey },
        "Duplicate reminder skipped",
      );
      return { created: false, reason: "duplicate" as const };
    }
    throw error;
  }

  await publishNotification({
    userId: data.userId,
    notification: toNotificationPayload(notification),
  });
  logger.info(
    {
      assignmentId: data.assignmentId,
      notificationId: notification.id,
      userId: data.userId,
    },
    "Reminder notification created and published",
  );

  return {
    created: true,
    notification: toNotificationPayload(notification),
  };
}
