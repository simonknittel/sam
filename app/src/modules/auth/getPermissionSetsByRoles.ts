import { type PermissionString, type Role } from "@prisma/client";
import { type PermissionSet } from "./PermissionSet";
import { transformPermissionStringToPermissionSet } from "./transformPermissionStringToPermissionSet";

type Roles = (Role & {
  permissionStrings: PermissionString[];
})[];

export const getPermissionSetsByRoles = (roles: Roles): PermissionSet[] =>
  roles.flatMap((role) =>
    role.permissionStrings.map((permissionString) =>
      transformPermissionStringToPermissionSet(
        permissionString.permissionString,
      ),
    ),
  );
