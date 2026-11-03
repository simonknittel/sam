import { EventPositionRoleMatch } from "@sam-monorepo/database/browser";

/** The required roles of a position, as the lineup loads them */
export interface PositionRoleRequirement {
  readonly requiredRoles: readonly { readonly roleId: string }[];
  readonly requiredRoleMatch: EventPositionRoleMatch;
}

/**
 * Whether a citizen with these effective roles has the required roles of the
 * position. A position without required roles is for each citizen.
 */
export const hasRequiredRolesOfPosition = (
  position: PositionRoleRequirement,
  roleIds: ReadonlySet<string>,
) => {
  if (position.requiredRoles.length <= 0) return true;

  switch (position.requiredRoleMatch) {
    case EventPositionRoleMatch.ALL:
      return position.requiredRoles.every(({ roleId }) => roleIds.has(roleId));

    case EventPositionRoleMatch.ANY:
      return position.requiredRoles.some(({ roleId }) => roleIds.has(roleId));

    default:
      throw new Error(
        `Unknown role match: ${position.requiredRoleMatch satisfies never}`,
      );
  }
};
