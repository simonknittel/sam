import type { Prisma } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE, hasReachedMaxLevel } from "@sam-monorepo/domain";

/**
 * The role assignments that can get a salary: only the direct assignments
 * of citizens that are not deleted, not the inherited roles
 */
const SALARY_ASSIGNMENTS_ARGS = {
  where: { citizen: ACTIVE_CITIZEN_WHERE },
  select: { citizenId: true, currentLevel: true },
} as const satisfies Prisma.Role$assignmentsArgs;

/** A role with the role assignments that can get its salary */
export const SALARY_ROLE_SELECT = {
  id: true,
  name: true,
  maxLevel: true,
  assignments: SALARY_ASSIGNMENTS_ARGS,
} as const satisfies Prisma.RoleSelect;

type SalaryRole = Prisma.RoleGetPayload<{ select: typeof SALARY_ROLE_SELECT }>;

/**
 * The assignments of the role that get its salary. A role with levels pays
 * only at its maximum level, the same level gate as for the permissions.
 */
export const getPaidAssignments = (
  role: SalaryRole,
): SalaryRole["assignments"] =>
  role.assignments.filter((assignment) =>
    hasReachedMaxLevel({ currentLevel: assignment.currentLevel, role }),
  );
