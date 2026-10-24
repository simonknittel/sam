import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { getPaidAssignments, SALARY_ROLE_SELECT } from "./salaryRules.js";

/** A role with the number of citizens who get its salary */
export interface RoleForSalaries {
  readonly role: {
    readonly id: string;
    readonly name: string;
  };
  readonly citizenCount: number;
}

/**
 * All roles with the number of citizens who get their salary, for the
 * "citizens × SILC" preview of the salary editor. The same rule as the
 * salary job (see `getPaidAssignments()`). The editor renders the badge of a
 * role from its id, thus the role needs only its id and its name for the
 * sort.
 *
 * Requires `silcSetting;manage`, like the SILC settings page of the editor:
 * the list has also the roles that the actor cannot see.
 *
 * @throws ForbiddenError when the actor does not have the permission
 */
export const findRolesForSalaries = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<RoleForSalaries[]> => {
  requirePermission(actor, "silcSetting", "manage");

  const roles = await context.prisma.role.findMany({
    select: SALARY_ROLE_SELECT,
  });

  return roles.map((role) => ({
    role: { id: role.id, name: role.name },
    citizenCount: getPaidAssignments(role).length,
  }));
};
