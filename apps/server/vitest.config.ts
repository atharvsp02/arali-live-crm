import { defineConfig } from "vitest/config";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/live_crm_test";
const redisUrl = process.env.TEST_REDIS_URL ?? "redis://localhost:6379/15";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    hookTimeout: 20000,
    include: ["src/**/*.test.ts"],
    testTimeout: 15000,
    env: {
      NODE_ENV: "test",
      PORT: "4100",
      APP_URL: "http://127.0.0.1:4100",
      CLIENT_URL: "http://127.0.0.1:5173",
      DATABASE_URL: databaseUrl,
      REDIS_URL: redisUrl,
      JWT_SECRET: "test-jwt-secret-with-at-least-32-characters",
      JWT_EXPIRES_IN: "1d",
      FOLLOW_UP_DELAY_MS: "100",
      LOG_LEVEL: "silent",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/api.ts", "src/worker.ts", "src/types/**"],
    },
  },
});
