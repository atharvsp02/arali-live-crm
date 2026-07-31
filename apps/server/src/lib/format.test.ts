import { describe, expect, it } from "vitest";
import {
  formatAssignmentMessage,
  formatAssignmentRole,
  formatReminderMessage,
} from "@live-crm/shared";

describe("assignment formatting", () => {
  it.each([
    ["ACCOUNT_OWNER", "Account Owner"],
    ["SALES_REPRESENTATIVE", "Sales Representative"],
    ["RELATIONSHIP_MANAGER", "Relationship Manager"],
    ["CONTACT_OWNER", "Contact Owner"],
  ] as const)("formats %s", (role, label) => {
    expect(formatAssignmentRole(role)).toBe(label);
  });

  it("formats an immediate assignment message", () => {
    expect(formatAssignmentMessage("Acme Corp", "ACCOUNT_OWNER")).toBe(
      "You have been assigned to Acme Corp as Account Owner.",
    );
  });

  it("formats a reminder message", () => {
    expect(formatReminderMessage("Acme Corp")).toBe(
      "Reminder: Review your new assignment for Acme Corp.",
    );
  });
});
