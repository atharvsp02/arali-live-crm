import { Router } from "express";
import { notificationQuerySchema } from "@live-crm/shared";
import { prisma } from "../../config/database.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { AppError } from "../../lib/errors.js";
import { toNotificationPayload } from "../../lib/notifications.js";
import { parseUuidParam } from "../../lib/route-params.js";
import { authenticate } from "../../middleware/auth.js";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  "/unread-count",
  asyncHandler(async (request, response) => {
    const count = await prisma.notification.count({
      where: { userId: request.user!.id, readAt: null },
    });

    response.json({ data: { count } });
  }),
);

notificationsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const { status, page, limit } = notificationQuerySchema.parse(
      request.query,
    );
    const where = {
      userId: request.user!.id,
      ...(status === "unread" ? { readAt: null } : {}),
    };
    const [notifications, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: request.user!.id, readAt: null },
      }),
    ]);

    response.json({
      data: {
        items: notifications.map(toNotificationPayload),
        page,
        limit,
        total,
        unreadCount,
      },
    });
  }),
);

notificationsRouter.patch(
  "/read-all",
  asyncHandler(async (request, response) => {
    const result = await prisma.notification.updateMany({
      where: { userId: request.user!.id, readAt: null },
      data: { readAt: new Date() },
    });

    response.json({
      data: { updatedCount: result.count },
      message: "All notifications marked as read",
    });
  }),
);

notificationsRouter.patch(
  "/:id/read",
  asyncHandler(async (request, response) => {
    const id = parseUuidParam(request.params.id);
    await prisma.notification.updateMany({
      where: {
        id,
        userId: request.user!.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: request.user!.id,
      },
    });

    if (!notification) {
      throw new AppError(
        404,
        "NOTIFICATION_NOT_FOUND",
        "Notification was not found",
      );
    }

    response.json({
      data: toNotificationPayload(notification),
      message: "Notification marked as read",
    });
  }),
);
