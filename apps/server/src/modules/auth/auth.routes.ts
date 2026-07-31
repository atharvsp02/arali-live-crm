import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import { AUTH_COOKIE, loginSchema } from "@live-crm/shared";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { AppError } from "../../lib/errors.js";
import { signAuthToken } from "../../lib/jwt.js";
import { authenticate } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many login attempts. Please try again later.",
    },
  },
});

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
};

authRouter.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (request, response) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };
    const user = await prisma.user.findUnique({ where: { email } });
    const validPassword =
      user && (await bcrypt.compare(password, user.passwordHash));

    if (!user || !validPassword) {
      logger.warn({ email, ip: request.ip }, "Login failed");
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password",
      );
    }

    const token = signAuthToken(user.id);
    response.cookie(AUTH_COOKIE, token, cookieOptions);
    logger.info({ userId: user.id }, "User signed in");

    response.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        systemRole: user.systemRole,
      },
      message: "Signed in successfully",
    });
  }),
);

authRouter.post("/logout", (_request, response) => {
  response.clearCookie(AUTH_COOKIE, cookieOptions);
  response.json({ data: null, message: "Signed out successfully" });
});

authRouter.get("/me", authenticate, (request, response) => {
  response.json({ data: request.user });
});
