import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { buildTotalAndDeltaChart, normalizeOptions } from "../utils/chartData";

export const getDailyLoginStatisticChart = cache(
  withTrace("getDailyLoginStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration = {};
    const options = normalizeOptions();

    // The change of the first chart day compares with the last day before it
    const previousDay = await prisma.dailyLoginCount.findFirst({
      where: {
        date: {
          lt: options.fromDate,
        },
      },
      orderBy: {
        date: "desc",
      },
      select: {
        date: true,
      },
    });

    const rows = await prisma.dailyLoginCount.findMany({
      where: {
        date: {
          gte: previousDay?.date ?? options.fromDate,
        },
      },
      orderBy: {
        date: "asc",
      },
      select: {
        date: true,
        count: true,
      },
    });

    const orderedLogins = rows.map((row) => ({
      // `date` is a DATE column (midnight UTC) naming the counted day.
      // Europe/Berlin is always ahead of UTC, so the chart buckets it under
      // that same calendar day.
      createdAt: row.date,
      count: row.count,
    }));

    return buildTotalAndDeltaChart(
      orderedLogins,
      "logins",
      "Logins",
      configuration,
    );
  }),
);
