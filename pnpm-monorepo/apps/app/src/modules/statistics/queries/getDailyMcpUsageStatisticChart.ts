import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findDailyMcpUsageCountRows,
  type DailyMcpUsageCountRow,
} from "@sam-monorepo/application";
import { cache } from "react";
import { buildTotalAndDeltaChart, normalizeOptions } from "../utils/chartData";

export const getDailyMcpUsageStatisticChart = cache(
  withTrace("getDailyMcpUsageStatisticChart", async () => {
    const options = normalizeOptions();

    let rows: DailyMcpUsageCountRow[];
    try {
      rows = await findDailyMcpUsageCountRows(
        getApplicationContext(),
        await getRequestActor(),
        { fromDay: options.fromDateColumnValue },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }

    const orderedCounts = rows.map((row) => ({
      createdAt: row.day,
      count: row.count,
    }));

    return buildTotalAndDeltaChart(
      orderedCounts,
      options,
      "mcp-usage",
      "Einträge",
      {},
    );
  }),
);
