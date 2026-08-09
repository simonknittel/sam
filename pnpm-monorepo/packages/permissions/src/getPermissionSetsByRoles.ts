import { type PermissionString } from "@sam-monorepo/database/client";
import { type PermissionSet } from "./PermissionSet.js";
import { transformPermissionStringToPermissionSet } from "./transformPermissionStringToPermissionSet.js";

/** Only the permission strings matter, so partially selected roles work too */
type Roles = readonly {
  readonly permissionStrings: readonly Pick<
    PermissionString,
    "permissionString"
  >[];
}[];

export const getPermissionSetsByRoles = (roles: Roles): PermissionSet[] =>
  roles.flatMap((role) =>
    role.permissionStrings.map((permissionString) =>
      transformPermissionStringToPermissionSet(
        permissionString.permissionString,
      ),
    ),
  );
