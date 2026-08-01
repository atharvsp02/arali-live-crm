import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { allowedOrigins, env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { assignmentsRouter } from "./modules/assignments/assignments.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { companiesRouter } from "./modules/companies/companies.routes.js";
import { contactsRouter } from "./modules/contacts/contacts.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req: (request) => ({
          id: request.id,
          method: request.method,
          url: request.url,
          remoteAddress: request.remoteAddress,
        }),
        res: (response) => ({
          statusCode: response.statusCode,
        }),
      },
      autoLogging: {
        ignore: (request) => request.url === "/api/health",
      },
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/companies", companiesRouter);
  app.use("/api/contacts", contactsRouter);
  app.use("/api/assignments", assignmentsRouter);
  app.use("/api/notifications", notificationsRouter);

  if (env.NODE_ENV === "production") {
    const currentDirectory = dirname(fileURLToPath(import.meta.url));
    const webDirectory = resolve(currentDirectory, "../../web/dist");
    const indexPath = resolve(webDirectory, "index.html");

    if (existsSync(indexPath)) {
      app.use(express.static(webDirectory));
      app.use((request, response, next) => {
        if (
          request.method === "GET" &&
          !request.path.startsWith("/api/") &&
          !request.path.startsWith("/socket.io/")
        ) {
          response.sendFile(indexPath);
          return;
        }
        next();
      });
    }
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
