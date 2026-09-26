/**
 * Type-only import (`import type`, not `import { type }`): the client entry
 * is Node-only Prisma code, and this package is also bundled into browser
 * chunks — the import must be fully erased from the emitted JS.
 */
import type { PermissionString } from "@sam-monorepo/database/client";
import { type PermissionSet } from "./PermissionSet.js";
import { transformPermissionStringToPermissionSet } from "./transformPermissionStringToPermissionSet.js";

/** Only the permission strings matter, so partially selected roles work too */
type Roles = readonly {
  readonly permissionStrings: readonly Pick<
    PermissionString,
    "permissionString"
  >[];
}[];

/**
 * A permission string that more than one role grants gives one permission
 * set only. The result goes into the session, which the app sends to the
 * browser on every page.
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
