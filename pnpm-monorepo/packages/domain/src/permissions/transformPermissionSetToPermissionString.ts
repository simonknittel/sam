import type { PermissionSet } from "./PermissionSet.js";

/** The inverse of `transformPermissionStringToPermissionSet` */
export const transformPermissionSetToPermissionString = (
  permissionSet: PermissionSet,
) => {
  const parts: string[] = [permissionSet.resource, permissionSet.operation];

  for (const attribute of permissionSet.attributes ?? [])
    parts.push(`${attribute.key}=${String(attribute.value)}`);

  return parts.join(";");
};
