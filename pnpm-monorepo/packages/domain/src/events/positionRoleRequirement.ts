import { EventPositionRoleMatch } from "@sam-monorepo/database/browser";

/** The required roles of a position, as the lineup loads them */
export interface PositionRoleRequirement {
  readonly requiredRoles: readonly { readonly roleId: string }[];
  readonly requiredRoleMatch: EventPositionRoleMatch;
}

/**
 * The required roles of the position that a citizen with these effective
 * roles does not have. Empty when the citizen meets the requirement, and for
 * a position without required roles. With `ANY`, the citizen needs one of
 * the roles, thus without one of them all of them are missing.
 */
export const getMissingRequiredRoleIds = (
  position: PositionRoleRequirement,
  roleIds: ReadonlySet<string>,
): string[] => {
  const missingRoleIds = position.requiredRoles
    .map(({ roleId }) => roleId)
    .filter((roleId) => !roleIds.has(roleId));

  switch (position.requiredRoleMatch) {
    case EventPositionRoleMatch.ALL:
      return missingRoleIds;

    case EventPositionRoleMatch.ANY:
      return missingRoleIds.length < position.requiredRoles.length
        ? []
        : missingRoleIds;

    default:
      throw new Error(
        `Unknown role match: ${position.requiredRoleMatch satisfies never}`,
      );
  }
};
