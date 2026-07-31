import { Worker } from "bullmq";
import { REMINDER_QUEUE, type AssignmentReminderJob } from "@live-crm/shared";
import { prisma } from "./config/database.js";
import { logger } from "./config/logger.js";
import { closeRedisConnections, workerRedis } from "./config/redis.js";
import { processReminder } from "./queue/reminder-processor.js";

const worker = new Worker<AssignmentReminderJob>(
  REMINDER_QUEUE,
  async (job) => {
    logger.info(
      { jobId: job.id, assignmentId: job.data.assignmentId },
      "Reminder job started",
    );
    return processReminder(job.data);
  },
  {
    connection: workerRedis,
    concurrency: 5,
  },
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Reminder job completed");
});

worker.on("failed", (job, error) => {
  logger.error({ err: error, jobId: job?.id }, "Reminder job failed");
});

worker.on("error", (error) => {
  logger.error({ err: error }, "Worker error");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Worker shutdown started");
  await worker.close();
  await prisma.$disconnect();
  await closeRedisConnections();
  logger.info("Worker shutdown completed");
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown(signal)
      .catch((error) => {
        logger.error({ err: error }, "Worker shutdown failed");
      })
      .finally(() => process.exit());
  });
}

logger.info({ queue: REMINDER_QUEUE }, "Reminder worker started");
