import { UserRole } from "@sam-monorepo/database/browser";
import { comparePermissionSets } from "../permissions/comparePermissionSets.js";
import type { PermissionSet } from "../permissions/PermissionSet.js";

/**
 * The permissions that require the two-factor authentication of the Discord
 * account. `user;manage` includes `user;read`.
 */
const TWO_FACTOR_AUTHENTICATION_PERMISSION_SETS = [
  { resource: "role", operation: "manage" },
  { resource: "user", operation: "read" },
  { resource: "systemLog", operation: "read" },
] as const satisfies readonly PermissionSet[];

export interface TwoFactorAuthenticationSubject {
  readonly userRole: UserRole | null;
  /** The own permissions, without admin mode */
  readonly permissionSets: PermissionSet[];
  /** Null when the status is unknown */
  readonly discordTwoFactorEnabled: boolean | null;
}

/**
 * Whether the user cannot use the app before they enable the two-factor
 * authentication of their Discord account: an admin or a user with one of
 * the permissions above, without a two-factor authentication that a Discord
 * login confirmed.
 */
export const isMissingTwoFactorAuthentication = ({
  userRole,
  permissionSets,
  discordTwoFactorEnabled,
}: TwoFactorAuthenticationSubject) =>
  discordTwoFactorEnabled !== true &&
  (userRole === UserRole.ADMIN ||
    TWO_FACTOR_AUTHENTICATION_PERMISSION_SETS.some((permissionSet) =>
      comparePermissionSets(permissionSet, permissionSets),
    ));
