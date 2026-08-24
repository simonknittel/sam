import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { buildTotalAndDeltaChart } from "../utils/chartData";

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
