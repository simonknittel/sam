import type { Prisma } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE, hasReachedMaxLevel } from "@sam-monorepo/domain";

/** Only the direct assignments can get a salary, not the inherited roles */
const SALARY_ASSIGNMENTS_ARGS = {
  where: { citizen: ACTIVE_CITIZEN_WHERE },
  select: { citizenId: true, currentLevel: true },
} as const satisfies Prisma.Role$assignmentsArgs;

export const SALARY_ROLE_SELECT = {
  id: true,
  name: true,
  maxLevel: true,
  assignments: SALARY_ASSIGNMENTS_ARGS,
} as const satisfies Prisma.RoleSelect;

type SalaryRole = Prisma.RoleGetPayload<{ select: typeof SALARY_ROLE_SELECT }>;

export const getPaidAssignments = (
  role: SalaryRole,
): SalaryRole["assignments"] =>
  role.assignments.filter((assignment) =>
    hasReachedMaxLevel({ currentLevel: assignment.currentLevel, role }),
  );
