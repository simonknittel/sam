import {
  getLocalDate,
  getStartOfLocalDay,
  ORGANIZATION_TIMEZONE,
} from "../timeZone.js";

/**
 * Null when the window has no time limit (0).
 */
export const getLogAnalyzerWindowStart = (daysToLoad: number, now: Date) => {
  if (daysToLoad <= 0) return null;

  const { year, month, day } = getLocalDate(now, ORGANIZATION_TIMEZONE);

  return getStartOfLocalDay(
    { year, month, day: day - daysToLoad },
    ORGANIZATION_TIMEZONE,
  );
};
