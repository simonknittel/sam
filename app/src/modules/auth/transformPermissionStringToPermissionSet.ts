import type { PermissionSet } from "./common";

export const transformPermissionStringToPermissionSet = (
  permissionString: string,
) => {
  const [resource, operation, ...attributeStrings] =
    permissionString.split(";");

  if (!resource || !operation) throw new Error("Invalid permissionString");

  // @ts-expect-error
  const permissionSet: PermissionSet = {
    // @ts-expect-error
    resource,
    // @ts-expect-error
    operation,
  } satisfies PermissionSet;

  if (attributeStrings.length > 0) {
    // @ts-expect-error
    permissionSet.attributes = attributeStrings.map((attributeString) => {
      const [key, value] = attributeString.split("=");
      if (!key || !value) throw new Error("Invalid attributeString");
      return { key, value };
    });
  }

  return permissionSet;
};
