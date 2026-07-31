import { Router } from "express";
import { prisma } from "../../config/database.js";
import { redis } from "../../config/redis.js";

export const healthRouter = Router();

healthRouter.get("/", async (_request, response) => {
  const [databaseResult, redisResult] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);
  const database =
    databaseResult.status === "fulfilled" ? "connected" : "unavailable";
  const redisStatus =
    redisResult.status === "fulfilled" ? "connected" : "unavailable";
  const healthy = database === "connected" && redisStatus === "connected";

  response.status(healthy ? 200 : 503).json({
    data: {
      api: "healthy",
      database,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    },
  });
});
