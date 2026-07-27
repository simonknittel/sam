import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getMonthlySalaryOfCurrentCitizen = cache(
  withTrace("monthlySalaryOfCurrentCitizen", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) return null;
    if (
      !(await authentication.authorize("silcBalanceOfCurrentCitizen", "read"))
    )
      forbidden();

    const roleSalaries = await prisma.silcRoleSalary.findMany({
      where: {
        roleId: {
          in: authentication.session.entity.roleAssignments.map(
            (assignment) => assignment.roleId,
          ),
        },
      },
    });

    return roleSalaries.reduce((total, salary) => total + salary.value, 0);
  }),
);
