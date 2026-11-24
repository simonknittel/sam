import type { Prisma } from "@sam-monorepo/database/client";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";

export const ROLE_SALARY_SELECT = {
  id: true,
  roleId: true,
  value: true,
  dayOfMonth: true,
} as const satisfies Prisma.SilcRoleSalarySelect;

export type RoleSalaryRow = Prisma.SilcRoleSalaryGetPayload<{
  select: typeof ROLE_SALARY_SELECT;
}>;

export const findRoleSalaryRows = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<RoleSalaryRow[]> => {
  requirePermission(actor, "silcSetting", "manage");

  return context.prisma.silcRoleSalary.findMany({ select: ROLE_SALARY_SELECT });
};
