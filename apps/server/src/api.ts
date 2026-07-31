import { createServer } from "node:http";
import { prisma } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { closeRedisConnections } from "./config/redis.js";
import { reminderQueue } from "./queue/reminder-queue.js";
import {
  createSocketServer,
  startNotificationSubscriber,
} from "./realtime/socket-server.js";
import { createApp } from "./app.js";

const app = createApp();
const httpServer = createServer(app);
const io = createSocketServer(httpServer);

async function start() {
  await prisma.$connect();
  logger.info("Database connected");
  await startNotificationSubscriber(io);

  httpServer.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "API server started");
  });
}

async function shutdown(signal: string) {
  logger.info({ signal }, "API shutdown started");
  io.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await reminderQueue.close();
  await prisma.$disconnect();
  await closeRedisConnections();
  logger.info("API shutdown completed");
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown(signal)
      .catch((error) => {
        logger.error({ err: error }, "API shutdown failed");
      })
      .finally(() => process.exit());
  });
}

start().catch((error) => {
  logger.fatal({ err: error }, "API startup failed");
  process.exit(1);
});
