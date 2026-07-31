import { NOTIFICATION_CHANNEL, type NotificationEvent } from "@live-crm/shared";
import { redisPublisher } from "../config/redis.js";

export async function publishNotification(event: NotificationEvent) {
  await redisPublisher.publish(NOTIFICATION_CHANNEL, JSON.stringify(event));
}
