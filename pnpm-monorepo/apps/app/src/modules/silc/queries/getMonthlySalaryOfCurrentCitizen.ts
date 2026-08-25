import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getMonthlySalaryOfRoles } from "./getMonthlySalaryOfRoles";

export const getMonthlySalaryOfCurrentCitizen = cache(
  withTrace("monthlySalaryOfCurrentCitizen", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) return null;
    if (
      !(await authentication.authorize("silcBalanceOfCurrentCitizen", "read"))
    )
      forbidden();

    return getMonthlySalaryOfRoles(
      authentication.session.entity.roleAssignments.map(
        (assignment) => assignment.roleId,
      ),
    );
  }),
);
