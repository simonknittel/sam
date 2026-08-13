import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { startOfDay } from "date-fns";
import { forbidden } from "next/navigation";
import { cache } from "react";
import {
  buildTotalAndDeltaChart,
  formatDateKey,
  normalizeOptions,
} from "../utils/chartData";

export const getDailySilcStatisticChart = cache(
  withTrace("getDailySilcStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration = {};
    const options = normalizeOptions();

    const transactions = await prisma.silcTransaction.findMany({
      where: {
        deletedAt: null,
        value: {
          gt: 0,
        },
        createdAt: {
          gte: options.fromDate,
          lt: options.toDateExclusive,
        },
      },
      select: {
        createdAt: true,
        value: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const totalsByDate = new Map<string, number>();

    for (const transaction of transactions) {
      const createdAt = startOfDay(transaction.createdAt);
      const key = formatDateKey(createdAt);
      const current = totalsByDate.get(key) ?? 0;
      totalsByDate.set(key, current + transaction.value);
    }

    const orderedTotals = options.axisPoints.map(({ key, timestamp }) => {
      const createdAt = new Date(timestamp);

      return {
        createdAt,
        count: totalsByDate.get(key) ?? 0,
      };
    });

    return buildTotalAndDeltaChart(
      orderedTotals,
      "silc",
      "SILC",
      configuration,
    );
  }),
);
