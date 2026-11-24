import type { PermissionSet } from "@sam-monorepo/domain";
import { LOGIN_MANAGE_PERMISSION_SET } from "../../auth/clearedCitizens.js";

/** `otherRole;manage` includes the read */
export const getRoleReceiverPermissionSets = (
  roleId: string,
): readonly PermissionSet[] => [
  LOGIN_MANAGE_PERMISSION_SET,
  {
    resource: "otherRole",
    operation: "read",
    attributes: [{ key: "roleId", value: roleId }],
  },
];
