import {
  addDaysToLocalDate,
  compareLocalDates,
  getLocalDatesOfRange,
  parseLocalDateKey,
  toLocalDateKey,
  type LocalDate,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { isRoleVisible } from "../roles/roleVisibility.js";
import { withSpan } from "../withSpan.js";
import {
  FIRST_STATISTICS_DATE,
  FIRST_STATISTICS_DAY,
  getLastStatisticsDate,
  getStatisticDefinition,
  STATISTIC_CATALOG,
  StatisticIdsFilter,
  StatisticKey,
  type StatisticUnit,
} from "./statisticCatalog.js";
import {
  readStatisticRows,
  type StatisticValueRow,
} from "./statisticViewRows.js";

export const DEFAULT_STATISTIC_DAY_COUNT = 30;

/** One year, also a leap year. It keeps the answer small. */
export const MAXIMUM_STATISTIC_DAY_COUNT = 366;

/** The default of the variable `top` of the dashboard */
const DEFAULT_STATISTIC_SERIES_LIMIT = 15;

/** With the maximum range, 50 series give at most 18,300 values */
const MAXIMUM_STATISTIC_SERIES_LIMIT = 50;

const MAXIMUM_STATISTIC_IDS = 50;

const STATISTICS_WITH_IDS_FILTER = STATISTIC_CATALOG.filter(
  (statistic) => statistic.idsFilter !== null,
).map((statistic) => statistic.key);

export const getStatisticInputSchema = z.object({
  key: z.enum(StatisticKey).describe("The key of the statistic."),
  from: z.iso
    .date()
    .optional()
    .describe(
      `The first day, YYYY-MM-DD. Default: ${DEFAULT_STATISTIC_DAY_COUNT - 1} days before to. A day before ${FIRST_STATISTICS_DAY}, the first day of the statistics, becomes ${FIRST_STATISTICS_DAY}.`,
    ),
  to: z.iso
    .date()
    .optional()
    .describe(
      "The last day, YYYY-MM-DD. Default: yesterday. A later day becomes yesterday: today has no value yet.",
    ),
  series_limit: z
    .int()
    .min(1)
    .max(MAXIMUM_STATISTIC_SERIES_LIMIT)
    .default(DEFAULT_STATISTIC_SERIES_LIMIT)
    .describe(
      "The maximum number of series. The series with the highest last value in the range come first; the name breaks a tie.",
    ),
  ids: z
    .array(idSchema)
    .min(1)
    .max(MAXIMUM_STATISTIC_IDS)
    .optional()
    .describe(
      `Only the series of these items: the ids of ship variants for ${StatisticKey.ShipsPerVariant}, the ids of roles for ${StatisticKey.CitizensPerRole}. The other statistics refuse ids. Without ids, these two statistics give only the items with a value above 0 on a day of the range.`,
    ),
});

export type GetStatisticInput = z.output<typeof getStatisticInputSchema>;

export interface StatisticSeriesOutput {
  readonly id: string;
  readonly name: string;
  /** Null for a day without a value */
  readonly values: (number | null)[];
}

export interface GetStatisticOutput {
  readonly key: StatisticKey;
  readonly unit: StatisticUnit;
  /** After the corrections, `YYYY-MM-DD` */
  readonly from: string;
  /** After the corrections, `YYYY-MM-DD` */
  readonly to: string;
  readonly days: string[];
  readonly series: StatisticSeriesOutput[];
  readonly total_series: number;
}

interface RankedSeries extends StatisticSeriesOutput {
  /** The value of the last day in the range with a value */
  readonly lastValue: number;
}

/**
 * The schema accepts only the days of the calendar, thus the error is a defense
 * in depth
 */
const parseDay = (day: string): LocalDate => {
  const date = parseLocalDateKey(day);
  if (!date) throw new ValidationError(`${day} is not a day`);

  return date;
};

const earlierOf = (first: LocalDate, second: LocalDate) =>
  compareLocalDates(first, second) <= 0 ? first : second;

const laterOf = (first: LocalDate, second: LocalDate) =>
  compareLocalDates(first, second) >= 0 ? first : second;

/** `YYYY-MM-DD` */
interface StatisticRange {
  readonly from: string;
  readonly to: string;
  readonly days: string[];
}

const resolveRange = (
  context: Pick<ApplicationContext, "now">,
  input: Pick<GetStatisticInput, "from" | "to">,
): StatisticRange => {
  const lastDate = getLastStatisticsDate(context);
  const to = input.to ? earlierOf(parseDay(input.to), lastDate) : lastDate;
  const from = laterOf(
    input.from
      ? parseDay(input.from)
      : addDaysToLocalDate(to, -(DEFAULT_STATISTIC_DAY_COUNT - 1)),
    FIRST_STATISTICS_DATE,
  );

  if (compareLocalDates(from, to) > 0)
    throw new ValidationError(
      `The range from ${toLocalDateKey(from)} to ${toLocalDateKey(to)} has no day. The statistics have the days from ${FIRST_STATISTICS_DAY} until yesterday (${toLocalDateKey(lastDate)}), and from must not be after to.`,
    );

  // The range starts at the earliest on the first day of the statistics,
  // thus the loop is bounded
  const days = getLocalDatesOfRange({ start: from, end: to });
  if (days.length > MAXIMUM_STATISTIC_DAY_COUNT)
    throw new ValidationError(
      `The range from ${toLocalDateKey(from)} to ${toLocalDateKey(to)} has ${days.length} days. The maximum is ${MAXIMUM_STATISTIC_DAY_COUNT} days.`,
    );

  return {
    from: toLocalDateKey(from),
    to: toLocalDateKey(to),
    days: days.map(toLocalDateKey),
  };
};

const toSeries = (
  rows: readonly StatisticValueRow[],
  days: readonly string[],
): RankedSeries[] =>
  Array.from(
    Map.groupBy(rows, (row) => row.seriesId),
    ([id, seriesRows]) => {
      const valuesByDay = new Map(
        seriesRows.map((row) => [row.day, row.value]),
      );
      const lastRow = seriesRows.reduce((latest, row) =>
        row.day > latest.day ? row : latest,
      );

      return {
        id,
        name: lastRow.seriesName,
        values: days.map((day) => valuesByDay.get(day) ?? null),
        lastValue: lastRow.value,
      };
    },
  );

/**
 * The ICU collation of the order of the dashboard panels (`und-x-icu` in
 * PostgreSQL). V8 replaces the root locale `und` with the default locale of
 * the process, thus the collator uses English: its collation is the root
 * collation without changes.
 */
const seriesCollator = new Intl.Collator("en");

/**
 * The order of the panels of the dashboard (`ORDER BY value DESC, name COLLATE
 * "und-x-icu", id COLLATE "und-x-icu"`)
 */
const compareSeries = (first: RankedSeries, second: RankedSeries) =>
  second.lastValue - first.lastValue ||
  seriesCollator.compare(first.name, second.name) ||
  seriesCollator.compare(first.id, second.id);

/**
 * The role statistic gives only the roles that the actor can see, also with the
 * filter by ids. An id without a row in the range gives no series.
 */
export const getStatistic = (
  context: ApplicationContext,
  actor: Actor,
  input: GetStatisticInput,
): Promise<GetStatisticOutput> =>
  withSpan(context, "getStatistic", async () => {
    requirePermission(actor, "globalStatistics", "read");

    const statistic = getStatisticDefinition(input.key);
    if (input.ids && statistic.idsFilter === null)
      throw new ValidationError(
        `The statistic ${input.key} has no filter by ids. Only ${STATISTICS_WITH_IDS_FILTER.join(" and ")} have one.`,
      );

    const { from, to, days } = resolveRange(context, input);

    const rows = await readStatisticRows(context, {
      key: input.key,
      from,
      to,
      ids: input.ids,
    });
    const series = toSeries(rows, days)
      .filter(
        (item) =>
          statistic.idsFilter !== StatisticIdsFilter.Roles ||
          isRoleVisible(actor, item.id),
      )
      .toSorted(compareSeries);

    return {
      key: statistic.key,
      unit: statistic.unit,
      from,
      to,
      days,
      series: series
        .slice(0, input.series_limit)
        .map(({ id, name, values }) => ({ id, name, values })),
      total_series: series.length,
    };
  });
