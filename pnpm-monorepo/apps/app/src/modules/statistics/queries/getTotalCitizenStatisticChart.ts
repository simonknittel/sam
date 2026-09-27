import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { forbidden } from "next/navigation";
import { cache } from "react";
import {
  buildTotalAndDeltaChart,
  formatDateKey,
  normalizeOptions,
} from "../utils/chartData";

export const getTotalCitizenStatisticChart = cache(
  withTrace("getTotalCitizenStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration = {};
    const options = normalizeOptions();

    const [baselineCount, citizens] = await Promise.all([
      prisma.citizen.count({
        where: {
          ...ACTIVE_CITIZEN_WHERE,
          createdAt: {
            lt: options.fromDate,
          },
        },
      }),
      prisma.citizen.findMany({
        where: {
          ...ACTIVE_CITIZEN_WHERE,
          createdAt: {
            gte: options.fromDate,
            lt: options.toDateExclusive,
          },
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);

    const citizensByDate = new Map<string, number>();
    for (const citizen of citizens) {
      const dateKey = formatDateKey(citizen.createdAt);
      citizensByDate.set(dateKey, (citizensByDate.get(dateKey) ?? 0) + 1);
    }

    let runningTotal = baselineCount;
    const orderedTotals = options.axisPoints.map(({ key, timestamp }) => {
      const delta = citizensByDate.get(key) ?? 0;
      runningTotal += delta;

      return {
        createdAt: new Date(timestamp),
        count: runningTotal,
      };
    });

    return buildTotalAndDeltaChart(
      orderedTotals,
      "citizens",
      "Citizens",
      configuration,
    );
  }),
);
