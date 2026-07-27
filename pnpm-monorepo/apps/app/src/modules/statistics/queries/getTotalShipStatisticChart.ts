import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { buildChartData, type StatisticChartData } from "../utils/chartData";

export const getTotalShipStatisticChart = cache(
  withTrace("getTotalShipStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const rows = await prisma.variantShipCount.findMany({
      select: {
        createdAt: true,
        count: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const totalsByDate = new Map<
      string,
      {
        createdAt: Date;
        count: number;
      }
    >();

    for (const row of rows) {
      const createdAt = new Date(row.createdAt);
      createdAt.setDate(createdAt.getDate() - 1); // Workaround: Offset due to timezone

      const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}-${createdAt.getDate()}`;
      const existing = totalsByDate.get(key);

      if (existing) {
        existing.count += row.count;
      } else {
        totalsByDate.set(key, {
          createdAt,
          count: row.count,
        });
      }
    }

    const orderedTotals = Array.from(totalsByDate.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    const configuration = {};

    const totalRecords = orderedTotals.map(({ createdAt, count }) => ({
      id: "total-ships",
      name: "Gesamt",
      createdAt,
      count,
    }));

    const deltaRecords = orderedTotals.flatMap(
      ({ createdAt, count }, index) => {
        if (index === 0) return [];

        return [
          {
            id: "total-ships-delta",
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
          name: "Gesamt",
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
