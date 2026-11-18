import {
  listStatistics,
  listStatisticsInputSchema,
  StatisticIdsFilter,
  StatisticKey,
  StatisticUnit,
  StatisticValueKind,
} from "@sam-monorepo/application";
import { AuditEventType, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const listStatisticsTool = defineTool({
  name: "list_statistics",
  group: ToolGroup.Statistics,
  title: "List the statistics",
  description: `Gives the statistics of the app Statistiken, with the same numbers as its dashboard: the key, the German title of the chart, the description, the unit, the kind of value, whether it has more than one series and which ids select its series. Also gives the first and the last day of the statistics. Use it before get_statistic to find the key. A day is a calendar day in ${ORGANIZATION_TIMEZONE}, and the last day is yesterday. The role statistic holds only the roles that the user can see.`,
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.STATISTICS_LISTED,
  inputSchema: listStatisticsInputSchema,
  outputSchema: z.strictObject({
    statistics: z.array(
      z.strictObject({
        key: z.enum(StatisticKey),
        title: z
          .string()
          .describe("German. The title of the chart in the app Statistiken."),
        description: z.string(),
        unit: z
          .enum(StatisticUnit)
          .describe(
            "usd_cents: USD cents, like the values of the fleet tools. count, auec and silc: whole numbers.",
          ),
        value_kind: z
          .enum(StatisticValueKind)
          .describe(
            "total_at_end_of_day: the state at the end of the day, for example the number of citizens. amount_of_day: what occurred on the day, for example the logins of the day.",
          ),
        has_multiple_series: z.boolean(),
        ids_filter: z
          .enum(StatisticIdsFilter)
          .nullable()
          .describe(
            "The items of the series, which the ids of get_statistic select: ship_variants (one series for each ship variant) or roles (one series for each role). Null: get_statistic refuses ids.",
          ),
      }),
    ),
    first_day: z.iso.date().describe("The first day of the statistics."),
    last_day: z.iso.date().describe("Yesterday: the last complete day."),
  }),
  isVisible: (actor) => actor.authorize("globalStatistics", "read"),
  handler: listStatistics,
});
