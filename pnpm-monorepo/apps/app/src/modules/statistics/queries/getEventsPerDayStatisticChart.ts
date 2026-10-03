import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { getLocalDateKey, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { buildTotalAndDeltaChart, normalizeOptions } from "../utils/chartData";

export const getEventsPerDayStatisticChart = cache(
  withTrace("getEventsPerDayStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration = {};
    const options = normalizeOptions();

    const events = await prisma.event.findMany({
      where: {
        startTime: {
          gte: options.fromDate,
          lt: options.toDate,
        },
      },
      select: {
        startTime: true,
      },
    });

    const eventsByDate = Map.groupBy(events, (event) =>
      getLocalDateKey(event.startTime, ORGANIZATION_TIMEZONE),
    );

    const orderedEvents = options.axisPoints.map(({ key, timestamp }) => {
      const createdAt = new Date(timestamp);

      return {
        createdAt,
        count: eventsByDate.get(key)?.length ?? 0,
      };
    });

    return buildTotalAndDeltaChart(
      orderedEvents,
      options,
      "events",
      "Events",
      configuration,
    );
  }),
);
