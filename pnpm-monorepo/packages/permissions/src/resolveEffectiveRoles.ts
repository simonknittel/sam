/**
 * The level gate: a role with levels counts only at its maximum level. A
 * role without levels always counts.
 */
export const hasReachedMaxLevel = (roleAssignment: {
  readonly currentLevel: number | null;
  readonly role: { readonly maxLevel: number | null };
}) =>
  !roleAssignment.role.maxLevel ||
  (roleAssignment.currentLevel ?? 0) >= roleAssignment.role.maxLevel;

/**
 * Resolves the effective roles of a citizen from their role assignments:
 * leveled roles only count once the max level is reached, and inherited
 * roles are included. Security-critical and shared by the app's per-request
 * loader `getEffectiveRoles()` (the session and every viewer) and the
 * Lambda's permission checks, so none of them can drift apart.
 */
export const resolveEffectiveRoles = <
  AssignedRole extends { maxLevel: number | null },
  InheritedRole,
>(
  roleAssignments: readonly {
    readonly currentLevel: number | null;
    readonly role: AssignedRole & {
      readonly inherits: readonly InheritedRole[];
    };
  }[],
): (AssignedRole | InheritedRole)[] =>
  roleAssignments
    .filter(hasReachedMaxLevel)
    .flatMap((roleAssignment): (AssignedRole | InheritedRole)[] => [
      roleAssignment.role,
      ...roleAssignment.role.inherits,
    ]);
