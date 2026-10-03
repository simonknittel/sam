import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { getLocalDateKey, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { buildTotalAndDeltaChart, normalizeOptions } from "../utils/chartData";

export const getTotalOrganizationStatisticChart = cache(
  withTrace("getTotalOrganizationStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration = {};
    const options = normalizeOptions();

    const [baselineCount, organizations] = await Promise.all([
      prisma.organization.count({
        where: {
          createdAt: {
            lt: options.fromDate,
          },
        },
      }),
      prisma.organization.findMany({
        where: {
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

    const organizationsByDate = new Map<string, number>();
    for (const organization of organizations) {
      const dateKey = getLocalDateKey(
        organization.createdAt,
        ORGANIZATION_TIMEZONE,
      );
      organizationsByDate.set(
        dateKey,
        (organizationsByDate.get(dateKey) ?? 0) + 1,
      );
    }

    let runningTotal = baselineCount;
    const orderedTotals = options.axisPoints.map(({ key, timestamp }) => {
      const delta = organizationsByDate.get(key) ?? 0;
      runningTotal += delta;

      return {
        createdAt: new Date(timestamp),
        count: runningTotal,
      };
    });

    return buildTotalAndDeltaChart(
      orderedTotals,
      options,
      "organizations",
      "Organisationen",
      configuration,
    );
  }),
);
