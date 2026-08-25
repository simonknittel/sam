import type { authenticate } from "@/modules/auth/server";
import { transformPermissionStringToPermissionSet } from "@sam-monorepo/permissions";

type Authentication = Exclude<Awaited<ReturnType<typeof authenticate>>, false>;

/**
 * Checks whether the session satisfies at least one of the permission
 * strings. An undefined or empty list means no permission is required.
 * Shared by the apps catalogue and the onboarding tasks/steps.
 */
export const satisfiesAnyPermissionString = async (
  authentication: Authentication,
  permissionStrings: readonly string[] | undefined,
) => {
  if (!permissionStrings || permissionStrings.length === 0) return true;

  const results = await Promise.all(
    permissionStrings.map((permissionString) => {
      const permissionSet =
        transformPermissionStringToPermissionSet(permissionString);

      return authentication.authorize(
        permissionSet.resource,
        permissionSet.operation,
        permissionSet.attributes,
      );
    }),
  );

  return results.some((result) => result === true);
};
