import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Role } from "@sam-monorepo/database/client";

/**
 * The SILC a citizen with these roles receives each month. The caller does
 * the authorization, because the necessary permission is different for the
 * own citizen and for other citizens.
 */
export const getMonthlySalaryOfRoles = withTrace(
  "getMonthlySalaryOfRoles",
  async (roleIds: readonly Role["id"][]) => {
    const roleSalaries = await prisma.silcRoleSalary.findMany({
      where: {
        roleId: {
          in: [...roleIds],
        },
      },
      select: {
        value: true,
      },
    });

    return roleSalaries.reduce((total, salary) => total + salary.value, 0);
  },
);
