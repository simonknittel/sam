import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { subHours } from "date-fns";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { buildTotalAndDeltaChart, formatDateKey } from "../utils/chartData";

export const getTotalShipStatisticChart = cache(
  withTrace("getTotalShipStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const rows = await prisma.variantShipCount.findMany({
      select: {
        createdAt: true,
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

      const key = formatDateKey(createdAt);
      const existing = totalsByDate.get(key);

      if (existing) {
        existing.count += row.count;
      } else {
        totalsByDate.set(key, {
          createdAt,
          count: row.count,
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
