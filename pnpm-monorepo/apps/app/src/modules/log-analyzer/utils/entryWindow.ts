import { getDateRangeFilter } from "@/modules/common/utils/getDateRangeFilter";
import { getLogAnalyzerWindowStart } from "@sam-monorepo/domain";

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

/** The start of the window which the `daysToLoad` setting gives */
const getWindowStart = (daysToLoad: number) =>
  getLogAnalyzerWindowStart(daysToLoad, new Date());

/**
 * A selected day covers that whole day as it appears in the table. Without a
 * date range, the window is the one of the server (see
 * `getLogAnalyzerWindowStart`).
 */
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

/**
 * The part of the date range before the rolling window. The upload of each
 * read reaches only the rolling window, thus the entries of this part are
 * shared only on request (see `useOlderEntrySharing`). Null without a date
 * range, and when the range has no such part.
 */
export const getOlderEntryWindow = (
  dateRange: DateRange,
  daysToLoad: number,
): EntryWindow | null => {
  if (!hasDateRange(dateRange)) return null;

  const rollingWindowStart = getWindowStart(daysToLoad);
  if (!rollingWindowStart) return null;

  const { start, end } = getEntryWindow(dateRange, daysToLoad);
  const olderEnd = end && end < rollingWindowStart ? end : rollingWindowStart;
  if (start && start >= olderEnd) return null;

  return { start, end: olderEnd };
};
