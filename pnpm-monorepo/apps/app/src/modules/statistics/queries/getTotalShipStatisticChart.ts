import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { subDays, subHours } from "date-fns";
import { forbidden } from "next/navigation";
import { cache } from "react";
import {
  buildTotalAndDeltaChart,
  formatDateKey,
  normalizeOptions,
} from "../utils/chartData";

export const getTotalShipStatisticChart = cache(
  withTrace("getTotalShipStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const options = normalizeOptions();

    /**
     * The change of the first chart day compares with the snapshot before
     * it. The snapshot of a day is written after that day, thus each
     * snapshot of a chart day is younger than the start of the chart.
     */
    const previousSnapshot = await prisma.variantShipCount.findFirst({
      where: {
        createdAt: {
          lt: options.fromDate,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
    });

    const rows = await prisma.variantShipCount.groupBy({
      by: ["createdAt"],
      where: {
        createdAt: {
          // One job run writes all rows of a snapshot. One day before its
          // last row is thus before its first row.
          gte: previousSnapshot
            ? subDays(previousSnapshot.createdAt, 1)
            : options.fromDate,
        },
      },
      _sum: {
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
      // The snapshot is written moments after midnight (Europe/Berlin) and
      // describes the day that just ended. Stepping back half a day lands
      // inside that day regardless of DST shifts.
      const createdAt = subHours(row.createdAt, 12);
      const count = row._sum.count ?? 0;

      const key = formatDateKey(createdAt);
      const existing = totalsByDate.get(key);

      if (existing) {
        existing.count += count;
      } else {
        totalsByDate.set(key, {
          createdAt,
          count,
        });
      }
    }

    const orderedTotals = Array.from(totalsByDate.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    const configuration = {};

    return buildTotalAndDeltaChart(
      orderedTotals,
      "total-ships",
      "Gesamt",
      configuration,
    );
  }),
);
