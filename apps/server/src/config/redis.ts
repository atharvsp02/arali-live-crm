import { Redis } from "ioredis";
import { env } from "./env.js";

const connectionOptions = {
  maxRetriesPerRequest: null,
};

export const redis = new Redis(env.REDIS_URL, connectionOptions);
export const redisPublisher = new Redis(env.REDIS_URL, connectionOptions);
export const redisSubscriber = new Redis(env.REDIS_URL, connectionOptions);
export const queueRedis = new Redis(env.REDIS_URL, connectionOptions);
export const workerRedis = new Redis(env.REDIS_URL, connectionOptions);

export async function closeRedisConnections() {
  await Promise.all([
    redis.quit(),
    redisPublisher.quit(),
    redisSubscriber.quit(),
    queueRedis.quit(),
    workerRedis.quit(),
  ]);
}
