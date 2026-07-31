import { Router } from "express";
import { usersQuerySchema } from "@live-crm/shared";
import { prisma } from "../../config/database.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { authenticate } from "../../middleware/auth.js";
import { authorize } from "../../middleware/authorize.js";

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
