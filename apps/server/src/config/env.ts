import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.url().default("http://localhost:4000"),
  CLIENT_URL: z.url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("1d"),
  FOLLOW_UP_DELAY_MS: z.coerce.number().int().min(0).default(30000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = z.prettifyError(parsed.error);
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;

export const allowedOrigins = [...new Set([env.APP_URL, env.CLIENT_URL])];
