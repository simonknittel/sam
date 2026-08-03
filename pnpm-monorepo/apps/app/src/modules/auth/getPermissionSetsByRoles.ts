import { type PermissionString } from "@sam-monorepo/database/client";
import { type PermissionSet } from "./PermissionSet";
import { transformPermissionStringToPermissionSet } from "./transformPermissionStringToPermissionSet";

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
