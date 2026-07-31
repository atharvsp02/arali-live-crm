import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { logger } from "../config/logger.js";
import { AppError } from "../lib/errors.js";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(
    new AppError(
      404,
      "NOT_FOUND",
      `Route ${request.method} ${request.path} was not found`,
    ),
  );
};

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  _next,
) => {
  void _next;

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    response.status(409).json({
      error: {
        code: "DUPLICATE_RESOURCE",
        message: "This resource already exists",
      },
    });
    return;
  }

  logger.error(
    {
      err: error,
      method: request.method,
      path: request.path,
      userId: request.user?.id,
    },
    "Unexpected request error",
  );

  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
};
