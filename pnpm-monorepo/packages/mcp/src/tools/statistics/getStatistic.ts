import {
  DEFAULT_STATISTIC_DAY_COUNT,
  FIRST_STATISTICS_DAY,
  getStatistic,
  getStatisticInputSchema,
  MAXIMUM_STATISTIC_DAY_COUNT,
  StatisticKey,
  StatisticUnit,
} from "@sam-monorepo/application";
import { AuditEventType, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const getStatisticTool = defineTool({
  name: "get_statistic",
  group: ToolGroup.Statistics,
  title: "Get a statistic",
  description: `Gives one value for each day of one statistic (the key from list_statistics): the days, and for each series its id, its name and its values. These are the numbers of the dashboard of the app Statistiken at its resolution "Tag"; the dashboard can also show weeks or months, this tool gives days only. A day is a calendar day in ${ORGANIZATION_TIMEZONE}. The last day is yesterday, because today is not complete. Default range: the last ${DEFAULT_STATISTIC_DAY_COUNT} days until yesterday. The range has at most ${MAXIMUM_STATISTIC_DAY_COUNT} days. A to after yesterday becomes yesterday, and a from before ${FIRST_STATISTICS_DAY} becomes ${FIRST_STATISTICS_DAY}; the answer gives the range that it covers. A range without a day of the statistics, or with more days, is an error. The answer has the series with the highest last value, at most series_limit; total_series gives the number of series before the limit. ids select the ship variants (ids from search_ship_variants or list_org_fleet) or the roles (ids from list_roles). The role statistic holds only the roles that the user can see, thus it can have fewer series than the dashboard.`,
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.STATISTIC_READ,
  inputSchema: getStatisticInputSchema,
  outputSchema: z.strictObject({
    key: z.enum(StatisticKey),
    unit: z.enum(StatisticUnit),
    from: z.iso.date().describe("The first day of the answer."),
    to: z.iso.date().describe("The last day of the answer."),
    days: z
      .array(z.iso.date())
      .describe(
        "Each day from from to to. The values of each series have the same order.",
      ),
    series: z.array(
      z.strictObject({
        id: z
          .string()
          .describe(
            "The id of the ship variant or of the role; total, store, in_game or unknown for the fleet values; the key for a statistic with one series.",
          ),
        name: z.string(),
        values: z
          .array(z.number().int().nullable())
          .describe(
            "One value for each day. Null: the day has no value, for example after a failed midnight run, or the item had no row on the day.",
          ),
      }),
    ),
    total_series: z
      .number()
      .int()
      .min(0)
      .describe("The number of series before series_limit."),
  }),
  isVisible: (actor) => actor.authorize("globalStatistics", "read"),
  handler: getStatistic,
});
