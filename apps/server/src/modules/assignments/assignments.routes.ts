import { Router } from "express";
import {
  companyAssignmentSchema,
  contactAssignmentSchema,
} from "@live-crm/shared";
import { prisma } from "../../config/database.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { authenticate } from "../../middleware/auth.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createCompanyAssignment,
  createContactAssignment,
} from "./assignment.service.js";

export const assignmentsRouter = Router();

assignmentsRouter.use(authenticate);

assignmentsRouter.post(
  "/companies",
  authorize("ADMIN"),
  validateBody(companyAssignmentSchema),
  asyncHandler(async (request, response) => {
    const result = await createCompanyAssignment({
      ...request.body,
      assignedById: request.user!.id,
    });

    response.status(201).json({
      data: result,
      message: "Company assigned successfully",
    });
  }),
);

assignmentsRouter.post(
  "/contacts",
  authorize("ADMIN"),
  validateBody(contactAssignmentSchema),
  asyncHandler(async (request, response) => {
    const result = await createContactAssignment({
      ...request.body,
      assignedById: request.user!.id,
    });

    response.status(201).json({
      data: result,
      message: "Contact assigned successfully",
    });
  }),
);

assignmentsRouter.get(
  "/me",
  authorize("USER"),
  asyncHandler(async (request, response) => {
    const [companyAssignments, contactAssignments] = await Promise.all([
      prisma.companyAssignment.findMany({
        where: { userId: request.user!.id },
        include: {
          company: {
            include: {
              _count: { select: { contacts: true } },
            },
          },
          assignedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contactAssignment.findMany({
        where: { userId: request.user!.id },
        include: {
          contact: {
            include: {
              company: { select: { id: true, name: true } },
            },
          },
          assignedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    response.json({
      data: {
        companies: companyAssignments,
        contacts: contactAssignments,
      },
    });
  }),
);

assignmentsRouter.get(
  "/",
  authorize("ADMIN"),
  asyncHandler(async (_request, response) => {
    const [companyAssignments, contactAssignments] = await Promise.all([
      prisma.companyAssignment.findMany({
        include: {
          company: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
          assignedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contactAssignment.findMany({
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true },
          },
          user: { select: { id: true, name: true, email: true } },
          assignedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    response.json({
      data: {
        companies: companyAssignments,
        contacts: contactAssignments,
      },
    });
  }),
);
