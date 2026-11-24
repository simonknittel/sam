import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { getPaidAssignments, SALARY_ROLE_SELECT } from "./salaryRules.js";

export interface RoleForSalaries {
  readonly role: {
    readonly id: string;
    readonly name: string;
  };
  readonly citizenCount: number;
}

/** The list has also the roles that the actor cannot see */
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
