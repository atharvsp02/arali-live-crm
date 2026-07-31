import { Prisma } from "@prisma/client";
import {
  formatAssignmentMessage,
  type AssignmentReminderJob,
  type AssignmentRole,
  type NotificationMetadata,
} from "@live-crm/shared";
import { prisma } from "../../config/database.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../lib/errors.js";
import { toNotificationPayload } from "../../lib/notifications.js";
import { enqueueReminder } from "../../queue/reminder-queue.js";
import { publishNotification } from "../../realtime/publisher.js";

async function validateRecipient(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, systemRole: "USER" },
    select: { id: true },
  });

  if (!user) {
    throw new AppError(
      404,
      "ASSIGNMENT_USER_NOT_FOUND",
      "Assignable user was not found",
    );
  }
}

async function dispatchAssignmentNotification(
  userId: string,
  notification: Parameters<typeof toNotificationPayload>[0],
  job: AssignmentReminderJob,
) {
  const payload = toNotificationPayload(notification);
  const [publishResult, queueResult] = await Promise.allSettled([
    publishNotification({ userId, notification: payload }),
    enqueueReminder(job),
  ]);

  if (publishResult.status === "rejected") {
    logger.error(
      {
        err: publishResult.reason,
        notificationId: notification.id,
        userId,
      },
      "Immediate notification publication failed",
    );
  }

  if (queueResult.status === "rejected") {
    logger.error(
      {
        err: queueResult.reason,
        assignmentId: job.assignmentId,
        userId,
      },
      "Reminder scheduling failed",
    );
  }
}

function duplicateAssignmentError() {
  return new AppError(
    409,
    "DUPLICATE_ASSIGNMENT",
    "This user is already assigned to the selected target",
  );
}

export async function createCompanyAssignment(input: {
  companyId: string;
  userId: string;
  role: AssignmentRole;
  assignedById: string;
}) {
  const [company] = await Promise.all([
    prisma.company.findUnique({
      where: { id: input.companyId },
      select: { id: true, name: true },
    }),
    validateRecipient(input.userId),
  ]);

  if (!company) {
    throw new AppError(404, "COMPANY_NOT_FOUND", "Company was not found");
  }

  let result;

  try {
    result = await prisma.$transaction(async (transaction) => {
      const assignment = await transaction.companyAssignment.create({
        data: input,
        include: {
          company: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
          assignedBy: { select: { id: true, name: true } },
        },
      });
      const metadata: NotificationMetadata = {
        entityType: "COMPANY",
        entityId: company.id,
        entityName: company.name,
        assignmentRole: input.role,
        assignmentId: assignment.id,
        assignedByUserId: input.assignedById,
      };
      const notification = await transaction.notification.create({
        data: {
          userId: input.userId,
          type: "COMPANY_ASSIGNED",
          title: "New company assignment",
          message: formatAssignmentMessage(company.name, input.role),
          metadata: metadata as unknown as Prisma.InputJsonValue,
        },
      });

      return { assignment, notification };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw duplicateAssignmentError();
    }
    throw error;
  }

  await dispatchAssignmentNotification(input.userId, result.notification, {
    assignmentType: "COMPANY",
    assignmentId: result.assignment.id,
    userId: input.userId,
    entityId: company.id,
    entityName: company.name,
    assignmentRole: input.role,
    assignedByUserId: input.assignedById,
  });

  logger.info(
    {
      assignmentId: result.assignment.id,
      notificationId: result.notification.id,
      userId: input.userId,
    },
    "Company assignment created",
  );

  return {
    assignment: result.assignment,
    notification: toNotificationPayload(result.notification),
  };
}

export async function createContactAssignment(input: {
  contactId: string;
  userId: string;
  role: AssignmentRole;
  assignedById: string;
}) {
  const [contact] = await Promise.all([
    prisma.contact.findUnique({
      where: { id: input.contactId },
      select: { id: true, firstName: true, lastName: true },
    }),
    validateRecipient(input.userId),
  ]);

  if (!contact) {
    throw new AppError(404, "CONTACT_NOT_FOUND", "Contact was not found");
  }

  const contactName = `${contact.firstName} ${contact.lastName}`;
  let result;

  try {
    result = await prisma.$transaction(async (transaction) => {
      const assignment = await transaction.contactAssignment.create({
        data: input,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true },
          },
          user: { select: { id: true, name: true, email: true } },
          assignedBy: { select: { id: true, name: true } },
        },
      });
      const metadata: NotificationMetadata = {
        entityType: "CONTACT",
        entityId: contact.id,
        entityName: contactName,
        assignmentRole: input.role,
        assignmentId: assignment.id,
        assignedByUserId: input.assignedById,
      };
      const notification = await transaction.notification.create({
        data: {
          userId: input.userId,
          type: "CONTACT_ASSIGNED",
          title: "New contact assignment",
          message: formatAssignmentMessage(contactName, input.role),
          metadata: metadata as unknown as Prisma.InputJsonValue,
        },
      });

      return { assignment, notification };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw duplicateAssignmentError();
    }
    throw error;
  }

  await dispatchAssignmentNotification(input.userId, result.notification, {
    assignmentType: "CONTACT",
    assignmentId: result.assignment.id,
    userId: input.userId,
    entityId: contact.id,
    entityName: contactName,
    assignmentRole: input.role,
    assignedByUserId: input.assignedById,
  });

  logger.info(
    {
      assignmentId: result.assignment.id,
      notificationId: result.notification.id,
      userId: input.userId,
    },
    "Contact assignment created",
  );

  return {
    assignment: result.assignment,
    notification: toNotificationPayload(result.notification),
  };
}
