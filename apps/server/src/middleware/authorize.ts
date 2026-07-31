import type { RequestHandler } from "express";
import type { SystemRole } from "@live-crm/shared";
import { hasSystemRole } from "../lib/authorization.js";
import { AppError } from "../lib/errors.js";

export function authorize(...roles: SystemRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(new AppError(401, "UNAUTHENTICATED", "Authentication is required"));
      return;
    }

    if (!hasSystemRole(request.user, roles)) {
      next(
        new AppError(
          403,
          "FORBIDDEN",
          "You do not have permission to perform this action",
        ),
      );
      return;
    }

    next();
  };
}
