import {
  toEntryWindow,
  type DateRange,
} from "@/modules/log-analyzer/utils/entryWindow";
import type { OlderEntriesTimeRange } from "@sam-monorepo/remote-control-program-runtime";

/**
 * Null when a day of the range is not valid, for example in the year 26. A
 * missing limit would count and upload more than the owner selected.
 */
export const toOlderEntriesRange = (
  dateRange: DateRange,
): OlderEntriesTimeRange | null => {
  const range = toEntryWindow(dateRange);

  const hasInvalidDay =
    (dateRange.from !== null && range.start === null) ||
    (dateRange.to !== null && range.end === null);

  return hasInvalidDay ? null : range;
};
