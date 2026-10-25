import { UserRole } from "@sam-monorepo/database/browser";
import { comparePermissionSets } from "../permissions/comparePermissionSets.js";
import type { PermissionSet } from "../permissions/PermissionSet.js";
import { transformPermissionStringToPermissionSet } from "../permissions/transformPermissionStringToPermissionSet.js";

/**
 * The permissions that require the two-factor authentication of the Discord
 * account. `manage` includes the other operations of the resource, thus
 * `user;manage` includes `user;read`.
 */
export const TWO_FACTOR_AUTHENTICATION_PERMISSION_SETS = [
  { resource: "role", operation: "manage" },
  { resource: "user", operation: "read" },
  { resource: "systemLog", operation: "read" },
  { resource: "discord-id", operation: "create" },
  { resource: "discord-id", operation: "confirm" },
  { resource: "discord-id", operation: "delete" },
  { resource: "classificationLevel", operation: "manage" },
  { resource: "noteType", operation: "manage" },
] as const satisfies readonly PermissionSet[];

/**
 * The operations of the rules for other roles
 * (`otherRole;<operation>;roleId=<role id or *>`) that require the two-factor
 * authentication, for each role id
 */
export const TWO_FACTOR_AUTHENTICATION_ROLE_RULE_OPERATIONS: readonly PermissionSet["operation"][] =
  ["assign", "manage"];

const isTwoFactorAuthenticationRoleRule = ({
  resource,
  operation,
}: PermissionSet) =>
  resource === "otherRole" &&
  TWO_FACTOR_AUTHENTICATION_ROLE_RULE_OPERATIONS.includes(operation);

/**
 * Whether one of the permission sets requires the two-factor authentication
 * of the Discord account
 */
const requiresTwoFactorAuthentication = (permissionSets: PermissionSet[]) =>
  TWO_FACTOR_AUTHENTICATION_PERMISSION_SETS.some((permissionSet) =>
    comparePermissionSets(permissionSet, permissionSets),
  ) || permissionSets.some(isTwoFactorAuthenticationRoleRule);

/** Whether a holder of the permission string requires it */
export const permissionStringRequiresTwoFactorAuthentication = (
  permissionString: string,
) =>
  requiresTwoFactorAuthentication([
    transformPermissionStringToPermissionSet(permissionString),
  ]);

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
    requiresTwoFactorAuthentication(permissionSets));
