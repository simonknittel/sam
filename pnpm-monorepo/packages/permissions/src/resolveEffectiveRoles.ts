/**
 * Resolves the effective roles of a citizen from their role assignments:
 * leveled roles only count once the max level is reached, and inherited
 * roles are included. Security-critical and shared by the app's session
 * callback (permission sets), `getWikiContext()` (wiki permission
 * resolution) and the notification Lambda so none of them can drift apart.
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
    .filter(
      (roleAssignment) =>
        !roleAssignment.role.maxLevel ||
        (roleAssignment.currentLevel ?? 0) >= roleAssignment.role.maxLevel,
    )
    .flatMap((roleAssignment): (AssignedRole | InheritedRole)[] => [
      roleAssignment.role,
      ...roleAssignment.role.inherits,
    ]);
