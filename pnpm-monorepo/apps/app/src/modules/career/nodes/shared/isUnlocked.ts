"use client";
import type { Role } from "@sam-monorepo/database/browser";

export const isUnlocked = (
  role: Pick<Role, "id">,
  assignedRoles: (Pick<Role, "id"> & { inherits: Pick<Role, "id">[] })[],
) => {
  return assignedRoles.some((assignedRole) => {
    if (assignedRole.id === role.id) return true;

    if (assignedRole.inherits.length > 0)
      return assignedRole.inherits.some(
        (inheritedRole) => inheritedRole.id === role.id,
      );

    return false;
  });
};
