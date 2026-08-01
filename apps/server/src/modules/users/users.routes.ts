import { Router } from "express";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import {
  createUserSchema,
  usersQuerySchema,
  type CreateUserInput,
} from "@live-crm/shared";
import { prisma } from "../../config/database.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { AppError } from "../../lib/errors.js";
import { authenticate } from "../../middleware/auth.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";

export const usersRouter = Router();

usersRouter.use(authenticate, authorize("ADMIN"));

usersRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const query = usersQuerySchema.parse(request.query);
    const users = await prisma.user.findMany({
      where: query.systemRole ? { systemRole: query.systemRole } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    response.json({ data: users });
  }),
);

usersRouter.post(
  "/",
  validateBody(createUserSchema),
  asyncHandler(async (request, response) => {
    const { name, email, password } = request.body as CreateUserInput;
    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          systemRole: "USER",
        },
        select: {
          id: true,
          name: true,
          email: true,
          systemRole: true,
          createdAt: true,
        },
      });

      response.status(201).json({
        data: user,
        message: "Team member created successfully",
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          409,
          "EMAIL_ALREADY_EXISTS",
          "An account with this email already exists",
        );
      }
      throw error;
    }
  }),
);
