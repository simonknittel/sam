import type { PermissionSet } from "./PermissionSet.js";

/**
 * Inverse of transformPermissionStringToPermissionSet, for the places that
 * hold parsed sets but have to hand out the original strings again (e.g.
 * the permission claim of an embed token). Attribute order is preserved,
 * otherwise round-tripping would be lossy for multi-attribute permissions.
 */
export const transformPermissionSetToPermissionString = (
  permissionSet: PermissionSet,
) => {
  const parts: string[] = [permissionSet.resource, permissionSet.operation];

  for (const attribute of permissionSet.attributes ?? [])
    parts.push(`${attribute.key}=${String(attribute.value)}`);

  return parts.join(";");
};
