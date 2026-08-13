import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import {
  buildTotalAndDeltaChart,
  formatDateKey,
  normalizeOptions,
} from "../utils/chartData";

export const getRegisteredUserStatisticChart = cache(
  withTrace("getRegisteredUserStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration = {};
    const options = normalizeOptions();

    const [baselineCount, registrations] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: {
            lt: options.fromDate,
          },
        },
      }),
      prisma.user.findMany({
        where: {
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

    const registrationsByDate = new Map<string, number>();
    for (const registration of registrations) {
      if (!registration.createdAt) continue;

      const dateKey = formatDateKey(registration.createdAt);
      registrationsByDate.set(
        dateKey,
        (registrationsByDate.get(dateKey) ?? 0) + 1,
      );
    }

    let runningTotal = baselineCount;
    const orderedTotals = options.axisPoints.map(({ key, timestamp }) => {
      const delta = registrationsByDate.get(key) ?? 0;
      runningTotal += delta;

      return {
        createdAt: new Date(timestamp),
        count: runningTotal,
      };
    });

    return buildTotalAndDeltaChart(
      orderedTotals,
      "registered-users",
      "Registrierte Benutzer",
      configuration,
    );
  }),
);
