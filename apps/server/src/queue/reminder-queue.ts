import { Queue } from "bullmq";
import {
  REMINDER_JOB,
  REMINDER_QUEUE,
  type AssignmentReminderJob,
} from "@live-crm/shared";
import { env } from "../config/env.js";
import { queueRedis } from "../config/redis.js";

export const reminderQueue = new Queue<AssignmentReminderJob>(REMINDER_QUEUE, {
  connection: queueRedis,
});

export function reminderJobId(assignmentType: string, assignmentId: string) {
  return `assignment-follow-up-${assignmentType}-${assignmentId}`;
}

export async function enqueueReminder(job: AssignmentReminderJob) {
  return reminderQueue.add(REMINDER_JOB, job, {
    delay: env.FOLLOW_UP_DELAY_MS,
    jobId: reminderJobId(job.assignmentType, job.assignmentId),
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  });
}
