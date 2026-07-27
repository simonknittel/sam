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

export const getDailySilcStatisticChart = cache(
  withTrace("getDailySilcStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration = {};
    const options = normalizeOptions();

    const transactions = await prisma.silcTransaction.findMany({
      where: {
        deletedAt: null,
        value: {
          gt: 0,
        },
        createdAt: {
          gte: options.fromDate,
          lt: options.toDateExclusive,
        },
      },
      select: {
        createdAt: true,
        value: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const totalsByDate = new Map<string, number>();

    for (const transaction of transactions) {
      const createdAt = startOfDay(transaction.createdAt);
      const key = formatDateKey(createdAt);
      const current = totalsByDate.get(key) ?? 0;
      totalsByDate.set(key, current + transaction.value);
    }

    const orderedTotals = options.axisPoints.map(({ key, timestamp }) => {
      const createdAt = new Date(timestamp);

      return {
        createdAt,
        count: totalsByDate.get(key) ?? 0,
      };
    });

    const totalRecords = orderedTotals.map((entry) => ({
      id: "silc",
      name: "SILC",
      createdAt: entry.createdAt,
      count: entry.count,
    }));

    const deltaRecords = orderedTotals.flatMap((entry, index) => {
      if (index === 0) return [];

      return [
        {
          id: "silc-delta",
          name: "Veränderung zum Vortag",
          createdAt: entry.createdAt,
          count: entry.count - orderedTotals[index - 1].count,
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
          name: "SILC",
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
