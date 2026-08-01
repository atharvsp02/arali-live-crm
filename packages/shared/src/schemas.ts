import { z } from "zod";
import {
  ASSIGNMENT_ROLES,
  ASSIGNMENT_TYPES,
  SYSTEM_ROLES,
} from "./constants.js";

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must have at least 2 characters")
    .max(80),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must have at least 8 characters")
    .max(128)
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number"),
});

export const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(120),
  website: z
    .union([z.url(), z.literal("")])
    .transform((value) => value || undefined)
    .optional(),
  industry: optionalText.pipe(z.string().max(100).optional()),
  description: optionalText.pipe(z.string().max(1000).optional()),
});

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z
    .union([z.email(), z.literal("")])
    .transform((value) => value || undefined)
    .optional(),
  phone: optionalText.pipe(z.string().max(40).optional()),
  jobTitle: optionalText.pipe(z.string().max(100).optional()),
  companyId: z
    .union([z.uuid(), z.literal("")])
    .transform((value) => value || undefined)
    .optional(),
});

export const companyAssignmentSchema = z.object({
  companyId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(ASSIGNMENT_ROLES),
});

export const contactAssignmentSchema = z.object({
  contactId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(ASSIGNMENT_ROLES),
});

export const notificationQuerySchema = z.object({
  status: z.enum(["all", "unread"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const contactQuerySchema = z.object({
  companyId: z.uuid().optional(),
  search: z.string().trim().max(100).optional(),
});

export const companyQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
});

export const usersQuerySchema = z.object({
  systemRole: z.enum(SYSTEM_ROLES).optional(),
});

export const assignmentTypeSchema = z.enum(ASSIGNMENT_TYPES);

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type CompanyAssignmentInput = z.infer<typeof companyAssignmentSchema>;
export type ContactAssignmentInput = z.infer<typeof contactAssignmentSchema>;
