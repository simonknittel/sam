import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { RoleAssignment } from "@sam-monorepo/database/client";
import { hasReachedMaxLevel } from "@sam-monorepo/permissions";

/**
 * The SILC a citizen with these role assignments receives each month. The
 * same rule as the salary job: only the direct assignments count, and a role
 * with levels pays only at its maximum level. The caller does the
 * authorization, because the necessary permission is different for the own
 * citizen and for other citizens.
 */
export const getMonthlySalaryOfRoles = withTrace(
  "getMonthlySalaryOfRoles",
  async (
    roleAssignments: readonly Pick<RoleAssignment, "roleId" | "currentLevel">[],
  ) => {
    const roles = await prisma.role.findMany({
      where: {
        id: {
          in: roleAssignments.map((assignment) => assignment.roleId),
        },
      },
      select: {
        id: true,
        maxLevel: true,
        silcSalaries: {
          select: {
            value: true,
          },
        },
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
  },
);
