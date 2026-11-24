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
 * The inheritance has one level. Security-critical: the session, every viewer,
 * the MCP server and the checks of other citizens (for example the recipients
 * of notifications) use this one rule.
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
