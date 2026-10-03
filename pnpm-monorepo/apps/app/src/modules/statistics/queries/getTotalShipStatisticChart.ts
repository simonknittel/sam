import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { buildTotalAndDeltaChart, normalizeOptions } from "../utils/chartData";

export const getTotalShipStatisticChart = cache(
  withTrace("getTotalShipStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const options = normalizeOptions();

    // The change of the first chart day compares with the last day before it
    const previousDay = await prisma.variantShipCount.findFirst({
      where: {
        day: {
          lt: options.fromDateColumnValue,
        },
      },
      orderBy: {
        day: "desc",
      },
      select: {
        day: true,
      },
    });

    const rows = await prisma.variantShipCount.groupBy({
      by: ["day"],
      where: {
        day: {
          gte: previousDay?.day ?? options.fromDateColumnValue,
        },
      },
      _sum: {
        count: true,
      },
      orderBy: {
        day: "asc",
      },
    });

    const orderedTotals = rows.map((row) => ({
      createdAt: row.day,
      count: row._sum.count ?? 0,
    }));

    const configuration = {};

    return buildTotalAndDeltaChart(
      orderedTotals,
      "total-ships",
      "Gesamt",
      configuration,
    );
  }),
);
