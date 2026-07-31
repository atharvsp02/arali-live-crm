export const SYSTEM_ROLES = ["ADMIN", "USER"] as const;

export const ASSIGNMENT_ROLES = [
  "ACCOUNT_OWNER",
  "SALES_REPRESENTATIVE",
  "RELATIONSHIP_MANAGER",
  "CONTACT_OWNER",
] as const;

export const NOTIFICATION_TYPES = [
  "COMPANY_ASSIGNED",
  "CONTACT_ASSIGNED",
  "FOLLOW_UP_REMINDER",
] as const;

export const ASSIGNMENT_TYPES = ["COMPANY", "CONTACT"] as const;

export const NOTIFICATION_EVENT = "notification:new";
export const NOTIFICATION_CHANNEL = "notification-events";
export const REMINDER_QUEUE = "notification-reminders";
export const REMINDER_JOB = "assignment-follow-up";
export const AUTH_COOKIE = "live_crm_session";

export type SystemRole = (typeof SYSTEM_ROLES)[number];
export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];
