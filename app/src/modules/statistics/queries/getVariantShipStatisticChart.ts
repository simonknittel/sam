import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
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

    const records = rows.map((row) => {
      const createdAt = new Date(row.createdAt);
      createdAt.setDate(createdAt.getDate() - 1); // Workaround: Offset due to timezone

      return {
        id: row.variantId,
        name: row.variant.name,
        createdAt,
        count: row.count,
      };
    });

    return {
      ...buildChartData(records, configuration),
      configuration,
    };
  }),
);
