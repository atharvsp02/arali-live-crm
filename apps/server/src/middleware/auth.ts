import type { RequestHandler } from "express";
import { AUTH_COOKIE, type AuthenticatedUser } from "@live-crm/shared";
import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import { AppError } from "../lib/errors.js";
import { verifyAuthToken } from "../lib/jwt.js";

export const authenticate: RequestHandler = async (
  request,
  _response,
  next,
) => {
  const token = request.cookies[AUTH_COOKIE] as string | undefined;

  if (!token) {
    next(new AppError(401, "UNAUTHENTICATED", "Authentication is required"));
    return;
  }

  try {
    const userId = verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
      },
    });

    if (!user) {
      throw new Error("User does not exist");
    }

    request.user = user as AuthenticatedUser;
    next();
  } catch (error) {
    logger.warn({ err: error, ip: request.ip }, "Authentication failed");
    next(new AppError(401, "UNAUTHENTICATED", "Authentication is required"));
  }
};
