import { getDateRangeFilter } from "@/modules/common/utils/getDateRangeFilter";
import { getLogAnalyzerWindowStart } from "@sam-monorepo/domain";
import type { EntryWindow } from "@sam-monorepo/remote-control-program-runtime";

/**
 * Days as `YYYY-MM-DD`. A missing bound means no limit. Without any bound the
 * Log Analyzer shows the rolling window of the `daysToLoad` setting.
 */
export interface DateRange {
  readonly from: string | null;
  readonly to: string | null;
}

export const NO_DATE_RANGE: DateRange = { from: null, to: null };

export const hasDateRange = ({ from, to }: DateRange) =>
  from !== null || to !== null;

/** A selected day covers that whole day as it appears in the table */
export const getEntryWindow = (
  dateRange: DateRange,
  daysToLoad: number,
): EntryWindow => {
  if (!hasDateRange(dateRange))
    return {
      start: getLogAnalyzerWindowStart(daysToLoad, new Date()),
      end: null,
    };

  const { gte, lt } = getDateRangeFilter(dateRange.from, dateRange.to);
  return { start: gte ?? null, end: lt ?? null };
};
