import { Router } from "express";
import { companyQuerySchema, companySchema } from "@live-crm/shared";
import { prisma } from "../../config/database.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { AppError } from "../../lib/errors.js";
import { parseUuidParam } from "../../lib/route-params.js";
import { authenticate } from "../../middleware/auth.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";

export const companiesRouter = Router();

companiesRouter.use(authenticate);

companiesRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const { search } = companyQuerySchema.parse(request.query);
    const companies = await prisma.company.findMany({
      where: search
        ? { name: { contains: search, mode: "insensitive" } }
        : undefined,
      include: {
        _count: {
          select: { contacts: true, assignments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    response.json({ data: companies });
  }),
);

companiesRouter.post(
  "/",
  authorize("ADMIN"),
  validateBody(companySchema),
  asyncHandler(async (request, response) => {
    const company = await prisma.company.create({
      data: {
        ...request.body,
        createdById: request.user!.id,
      },
    });

    response.status(201).json({
      data: company,
      message: "Company created successfully",
    });
  }),
);

companiesRouter.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = parseUuidParam(request.params.id);
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        contacts: true,
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!company) {
      throw new AppError(404, "COMPANY_NOT_FOUND", "Company was not found");
    }

    response.json({ data: company });
  }),
);
