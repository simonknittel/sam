import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { startOfDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { forbidden } from "next/navigation";
import { cache } from "react";
import {
  buildChartData,
  normalizeOptions,
  type StatisticChartData,
} from "../utils/chartData";

const formatDateKey = (date: Date) =>
  formatInTimeZone(date, "Europe/Berlin", "yyyy-MM-dd");

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
          lt: options.toDateExclusive,
        },
      },
      select: {
        startTime: true,
      },
    });

    const countsByDate = new Map<string, number>();
    for (const event of events) {
      const dayStart = startOfDay(event.startTime);
      const dateKey = formatDateKey(dayStart);
      const existing = countsByDate.get(dateKey) ?? 0;
      countsByDate.set(dateKey, existing + 1);
    }

    const orderedEvents = options.axisPoints.map(({ key, timestamp }) => {
      const createdAt = new Date(timestamp);

      return {
        createdAt,
        count: countsByDate.get(key) ?? 0,
      };
    });

    const totalRecords = orderedEvents.map((entry) => ({
      id: "events",
      name: "Events",
      createdAt: entry.createdAt,
      count: entry.count,
    }));

    const deltaRecords = orderedEvents.flatMap((entry, index) => {
      if (index === 0) return [];

      return [
        {
          id: "events-delta",
          name: "Veränderung zum Vortag",
          createdAt: entry.createdAt,
          count: entry.count - orderedEvents[index - 1].count,
        },
      ];
    });

    const chartData = buildChartData(
      [...totalRecords, ...deltaRecords],
      configuration,
    );

    const series = chartData.series.map((serie) =>
      serie.name === "Veränderung zum Vortag"
        ? {
            ...serie,
            yAxisIndex: 1,
            lineStyle: {
              type: "dashed" as const,
              width: 1,
            },
          }
        : serie,
    );

    return {
      ...chartData,
      series,
      configuration,
      yAxes: [
        {
          name: "Events",
          position: "left",
        },
        {
          name: "Δ Vortag",
          position: "right",
        },
      ],
    } satisfies StatisticChartData;
  }),
);
