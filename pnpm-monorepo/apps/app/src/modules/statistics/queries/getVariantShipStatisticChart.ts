import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { subHours } from "date-fns";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { buildChartData } from "../utils/chartData";

export const getVariantShipStatisticChart = cache(
  withTrace("getVariantShipStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration = {
      top: 15,
      filterEmpty: true,
    };

    const rows = await prisma.variantShipCount.findMany({
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            series: {
              select: {
                name: true,
              },
            },
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
