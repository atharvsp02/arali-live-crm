import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@live-crm/shared";
import { hasSystemRole } from "./authorization.js";

const admin: AuthenticatedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Admin",
  email: "admin@crm.local",
  systemRole: "ADMIN",
};

describe("hasSystemRole", () => {
  it("accepts a permitted role", () => {
    expect(hasSystemRole(admin, ["ADMIN"])).toBe(true);
  });

  it("rejects a role outside the allowlist", () => {
    expect(hasSystemRole(admin, ["USER"])).toBe(false);
  });

  it("rejects an empty allowlist", () => {
    expect(hasSystemRole(admin, [])).toBe(false);
  });
});
