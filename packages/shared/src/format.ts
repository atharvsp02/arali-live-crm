import type { AssignmentRole } from "./constants.js";

const roleLabels: Record<AssignmentRole, string> = {
  ACCOUNT_OWNER: "Account Owner",
  SALES_REPRESENTATIVE: "Sales Representative",
  RELATIONSHIP_MANAGER: "Relationship Manager",
  CONTACT_OWNER: "Contact Owner",
};

export function formatAssignmentRole(role: AssignmentRole) {
  return roleLabels[role];
}

export function formatAssignmentMessage(
  entityName: string,
  role: AssignmentRole,
) {
  return `You have been assigned to ${entityName} as ${formatAssignmentRole(role)}.`;
}

export function formatReminderMessage(entityName: string) {
  return `Reminder: Review your new assignment for ${entityName}.`;
}
