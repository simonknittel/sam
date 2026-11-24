import type { RoleAssignment } from "@sam-monorepo/database/client";
import { hasReachedMaxLevel } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

/**
 * The same rule as the salary job (see `getPaidAssignments()`). The caller does
 * the authorization, because the necessary permission is different for the own
 * citizen and for other citizens.
 */
export const getMonthlySalaryOfRoles = (
  context: Pick<ApplicationContext, "prisma" | "tracer">,
  roleAssignments: readonly Pick<RoleAssignment, "roleId" | "currentLevel">[],
): Promise<number> =>
  withSpan(context, "getMonthlySalaryOfRoles", async () => {
    const roles = await context.prisma.role.findMany({
      where: {
        id: { in: roleAssignments.map((assignment) => assignment.roleId) },
      },
      select: {
        id: true,
        maxLevel: true,
        silcSalaries: { select: { value: true } },
      },
    });

    const currentLevelByRoleId = new Map(
      roleAssignments.map((assignment) => [
        assignment.roleId,
        assignment.currentLevel,
      ]),
    );

    return roles
      .filter((role) =>
        hasReachedMaxLevel({
          currentLevel: currentLevelByRoleId.get(role.id) ?? null,
          role,
        }),
      )
      .flatMap((role) => role.silcSalaries)
      .reduce((total, salary) => total + salary.value, 0);
  });
