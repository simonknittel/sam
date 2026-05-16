import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import {
  buildChartData,
  normalizeOptions,
  type StatisticChartData,
} from "../utils/chartData";

export const getTotalCitizenStatisticChart = cache(
  withTrace("getTotalCitizenStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration = {};
    const options = normalizeOptions();

    const [baselineCount, citizens] = await Promise.all([
      prisma.entity.count({
        where: {
          createdAt: {
            lt: options.fromDate,
          },
        },
      }),
      prisma.entity.findMany({
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

    const citizensByDate = new Map<string, number>();
    for (const citizen of citizens) {
      const dateKey = `${citizen.createdAt.getFullYear()}-${citizen.createdAt.getMonth()}-${citizen.createdAt.getDate()}`;
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

    const totalRecords = orderedTotals.map(({ createdAt, count }) => ({
      id: "citizens",
      name: "Citizens",
      createdAt,
      count,
    }));

    const deltaRecords = orderedTotals.flatMap(
      ({ createdAt, count }, index) => {
        if (index === 0) return [];

        return [
          {
            id: "citizens-delta",
            name: "Veränderung zum Vortag",
            createdAt,
            count: count - orderedTotals[index - 1].count,
          },
        ];
      },
    );

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
          name: "Citizens",
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
