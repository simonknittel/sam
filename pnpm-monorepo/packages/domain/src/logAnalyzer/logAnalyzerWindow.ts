import {
  getLocalDate,
  getStartOfLocalDay,
  ORGANIZATION_TIMEZONE,
} from "../timeZone.js";

/**
 * The start of the rolling window of the Log Analyzer: the start of the day
 * `daysToLoad` calendar days before the day of `now`, in the time zone of
 * the organization. Null when the window has no time limit (0).
 *
 * The client and the server both use it. Thus the table, the upload and the
 * queries of the sharing see the same window, and the hash query covers each
 * entry which the upload sends.
 */
export const getLogAnalyzerWindowStart = (daysToLoad: number, now: Date) => {
  if (daysToLoad <= 0) return null;

  const { year, month, day } = getLocalDate(now, ORGANIZATION_TIMEZONE);

  return getStartOfLocalDay(
    { year, month, day: day - daysToLoad },
    ORGANIZATION_TIMEZONE,
  );
};
