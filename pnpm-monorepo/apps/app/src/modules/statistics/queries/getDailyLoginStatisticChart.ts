import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { buildChartData, type StatisticChartData } from "../utils/chartData";

export const getDailyLoginStatisticChart = cache(
  withTrace("getDailyLoginStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration = {};

    const rows = await prisma.dailyLoginCount.findMany({
      orderBy: {
        date: "asc",
      },
    });

    const orderedLogins = rows.map((row) => ({
      // `date` is a DATE column (midnight UTC) naming the counted day.
      // Europe/Berlin is always ahead of UTC, so the chart buckets it under
      // that same calendar day.
      createdAt: row.date,
      count: row.count,
    }));

    const totalRecords = orderedLogins.map((entry) => ({
      id: "logins",
      name: "Logins",
      createdAt: entry.createdAt,
      count: entry.count,
    }));

    const deltaRecords = orderedLogins.flatMap((entry, index) => {
      if (index === 0) return [];

      return [
        {
          id: "logins-delta",
          name: "Veränderung zum Vortag",
          createdAt: entry.createdAt,
          count: entry.count - orderedLogins[index - 1].count,
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
          name: "Logins",
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
