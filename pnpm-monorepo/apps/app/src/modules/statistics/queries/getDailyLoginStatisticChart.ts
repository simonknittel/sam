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
          lt: options.fromDateColumnValue,
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
          gte: previousDay?.date ?? options.fromDateColumnValue,
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
      createdAt: row.date,
      count: row.count,
    }));

    return buildTotalAndDeltaChart(
      orderedLogins,
      options,
      "logins",
      "Logins",
      configuration,
    );
  }),
);
