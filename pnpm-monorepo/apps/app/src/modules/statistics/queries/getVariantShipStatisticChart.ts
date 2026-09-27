import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
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
        day: {
          gte: options.fromDate,
        },
      },
      select: {
        variantId: true,
        day: true,
        count: true,
        variant: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        day: "asc",
      },
    });

    const records = rows.map((row) => ({
      id: row.variantId,
      name: row.variant.name,
      createdAt: row.day,
      count: row.count,
    }));

    return {
      ...buildChartData(records, configuration),
      configuration,
    };
  }),
);
