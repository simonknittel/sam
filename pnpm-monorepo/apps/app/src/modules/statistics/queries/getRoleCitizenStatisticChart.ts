import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { subHours } from "date-fns";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { buildChartData } from "../utils/chartData";

export const getRoleCitizenStatisticChart = cache(
  withTrace("getRoleCitizenStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration = {
      top: 15,
      filterEmpty: true,
    };

    const rows = await prisma.roleCitizenCount.findMany({
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const records = rows.map((row) => ({
      id: row.roleId,
      name: row.role.name,
      // The snapshot is written moments after midnight (Europe/Berlin) and
      // describes the day that just ended. Stepping back half a day lands
      // inside that day regardless of DST shifts.
      createdAt: subHours(row.createdAt, 12),
      count: row.count,
    }));

    return {
      ...buildChartData(records, configuration),
      configuration,
    };
  }),
);
