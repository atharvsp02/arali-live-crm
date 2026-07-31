import type { SystemRole } from "@live-crm/shared";
import type { AuthenticatedUser } from "@live-crm/shared";

export function hasSystemRole(
  user: AuthenticatedUser,
  allowedRoles: readonly SystemRole[],
) {
  return allowedRoles.includes(user.systemRole);
}
