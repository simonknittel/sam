import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { subHours } from "date-fns";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { buildChartData, normalizeOptions } from "../utils/chartData";

export const getVariantShipStatisticChart = cache(
  withTrace("getVariantShipStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration = {
      top: 15,
      filterEmpty: true,
    };

    const options = normalizeOptions();

    const rows = await prisma.variantShipCount.findMany({
      where: {
        // The snapshot of a day is written after that day. Thus each
        // snapshot of a chart day is younger than the start of the chart.
        createdAt: {
          gte: options.fromDate,
        },
      },
      select: {
        variantId: true,
        createdAt: true,
        count: true,
        variant: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const records = rows.map((row) => ({
      id: row.variantId,
      name: row.variant.name,
      // The snapshot is written moments after midnight (Europe/Berlin) and
      // describes the day that just ended. Stepping back half a day lands
      // inside that day regardless of DST shifts.
      createdAt: subHours(row.createdAt, 12),
      count: row.count,
    }));

    return {
      ...buildChartData(records, configuration),
      configuration,
    };
  }),
);
