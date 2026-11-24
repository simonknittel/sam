import type { PermissionString } from "@sam-monorepo/database/client";
import { type PermissionSet } from "./PermissionSet.js";
import { transformPermissionStringToPermissionSet } from "./transformPermissionStringToPermissionSet.js";

type Roles = readonly {
  readonly permissionStrings: readonly Pick<
    PermissionString,
    "permissionString"
  >[];
}[];

/**
 * Without duplicates, because the result goes into the session, which the app
 * sends to the browser on every page.
 */
export const getPermissionSetsByRoles = (roles: Roles): PermissionSet[] => {
  const permissionStrings = new Set(
    roles.flatMap((role) =>
      role.permissionStrings.map(
        (permissionString) => permissionString.permissionString,
      ),
    ),
  );

  return Array.from(permissionStrings, (permissionString) =>
    transformPermissionStringToPermissionSet(permissionString),
  );
};
