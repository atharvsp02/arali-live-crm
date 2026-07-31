import { Router } from "express";
import { contactQuerySchema, contactSchema } from "@live-crm/shared";
import { prisma } from "../../config/database.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { AppError } from "../../lib/errors.js";
import { parseUuidParam } from "../../lib/route-params.js";
import { authenticate } from "../../middleware/auth.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";

export const contactsRouter = Router();

contactsRouter.use(authenticate);

contactsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const { companyId, search } = contactQuerySchema.parse(request.query);
    const contacts = await prisma.contact.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        company: {
          select: { id: true, name: true },
        },
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    response.json({ data: contacts });
  }),
);

contactsRouter.post(
  "/",
  authorize("ADMIN"),
  validateBody(contactSchema),
  asyncHandler(async (request, response) => {
    if (request.body.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: request.body.companyId },
        select: { id: true },
      });

      if (!company) {
        throw new AppError(404, "COMPANY_NOT_FOUND", "Company was not found");
      }
    }

    const contact = await prisma.contact.create({
      data: {
        ...request.body,
        createdById: request.user!.id,
      },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });

    response.status(201).json({
      data: contact,
      message: "Contact created successfully",
    });
  }),
);

contactsRouter.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = parseUuidParam(request.params.id);
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        company: true,
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!contact) {
      throw new AppError(404, "CONTACT_NOT_FOUND", "Contact was not found");
    }

    response.json({ data: contact });
  }),
);
