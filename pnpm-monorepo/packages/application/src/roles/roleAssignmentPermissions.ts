import type { Actor } from "../actor.js";

export const canAssignRole = (
  actor: Pick<Actor, "authorize">,
  roleId: string,
) => actor.authorize("otherRole", "assign", [{ key: "roleId", value: roleId }]);

export const canDismissRole = (
  actor: Pick<Actor, "authorize">,
  roleId: string,
) =>
  actor.authorize("otherRole", "dismiss", [{ key: "roleId", value: roleId }]);

/** The role picker of a citizen shows only these roles */
export const canChangeRoleAssignment = (
  actor: Pick<Actor, "authorize">,
  roleId: string,
) => canAssignRole(actor, roleId) || canDismissRole(actor, roleId);
