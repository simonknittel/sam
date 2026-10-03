import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  ACTIVE_CITIZEN_WHERE,
  getLocalDateKey,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { buildTotalAndDeltaChart, normalizeOptions } from "../utils/chartData";

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
            lt: options.toDate,
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

    const citizensByDate = Map.groupBy(citizens, (citizen) =>
      getLocalDateKey(citizen.createdAt, ORGANIZATION_TIMEZONE),
    );

    let runningTotal = baselineCount;
    const orderedTotals = options.axisPoints.map(({ key, timestamp }) => {
      const delta = citizensByDate.get(key)?.length ?? 0;
      runningTotal += delta;

      return {
        createdAt: new Date(timestamp),
        count: runningTotal,
      };
    });

    return buildTotalAndDeltaChart(
      orderedTotals,
      options,
      "citizens",
      "Citizens",
      configuration,
    );
  }),
);
