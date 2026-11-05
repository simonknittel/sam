import { getDateRangeFilter } from "@/modules/common/utils/getDateRangeFilter";

/**
 * The time span of the entries. `end` is exclusive. A missing bound means no
 * limit.
 */
export interface EntryWindow {
  readonly start: Date | null;
  readonly end: Date | null;
}

/**
 * The days which the user selected, as `YYYY-MM-DD`. A missing bound means no
 * limit. Without any bound the Log Analyzer shows the rolling window of the
 * `daysToLoad` setting.
 */
export interface DateRange {
  readonly from: string | null;
  readonly to: string | null;
}

export const NO_DATE_RANGE: DateRange = { from: null, to: null };

export const hasDateRange = ({ from, to }: DateRange) =>
  from !== null || to !== null;

/**
 * The start of the window which the `daysToLoad` setting gives: the start of
 * the day `daysToLoad` days before today. Null when the window has no limit.
 */
const getWindowStart = (daysToLoad: number) => {
  if (daysToLoad <= 0) return null;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - daysToLoad);
  windowStart.setHours(0, 0, 0, 0);
  return windowStart;
};

/** A selected day covers that whole day as it appears in the table. */
export const getEntryWindow = (
  dateRange: DateRange,
  daysToLoad: number,
): EntryWindow => {
  if (!hasDateRange(dateRange))
    return { start: getWindowStart(daysToLoad), end: null };

  const { gte, lt } = getDateRangeFilter(dateRange.from, dateRange.to);
  return { start: gte ?? null, end: lt ?? null };
};

export const isInWindow = (date: Date, { start, end }: EntryWindow) =>
  (!start || date >= start) && (!end || date < end);
