import type { Server as HttpServer } from "node:http";
import { parse } from "cookie";
import { Server } from "socket.io";
import {
  AUTH_COOKIE,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_EVENT,
  type NotificationEvent,
} from "@live-crm/shared";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { redisSubscriber } from "../config/redis.js";
import { verifyAuthToken } from "../lib/jwt.js";

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parse(socket.request.headers.cookie ?? "");
      const token = cookies[AUTH_COOKIE];

      if (!token) {
        throw new Error("Missing authentication cookie");
      }

      const userId = verifyAuthToken(token);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new Error("User does not exist");
      }

      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    void socket.join(`user:${userId}`);
    logger.info({ socketId: socket.id, userId }, "Socket connected");

    socket.on("disconnect", (reason) => {
      logger.info(
        { socketId: socket.id, userId, reason },
        "Socket disconnected",
      );
    });
  });

  return io;
}

export async function startNotificationSubscriber(io: Server) {
  redisSubscriber.on("message", (channel, message) => {
    if (channel !== NOTIFICATION_CHANNEL) {
      return;
    }

    try {
      const event = JSON.parse(message) as NotificationEvent;

      if (!event.userId || !event.notification?.id) {
        throw new Error("Invalid notification event");
      }

      io.to(`user:${event.userId}`).emit(
        NOTIFICATION_EVENT,
        event.notification,
      );
      logger.info(
        {
          notificationId: event.notification.id,
          userId: event.userId,
        },
        "Notification event delivered",
      );
    } catch (error) {
      logger.error({ err: error }, "Invalid Redis notification event");
    }
  });

  await redisSubscriber.subscribe(NOTIFICATION_CHANNEL);
  logger.info({ channel: NOTIFICATION_CHANNEL }, "Redis subscriber started");
}
