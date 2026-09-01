/**
 * The longest window the shared entries query accepts, well above the 14 days
 * the Log Analyzer reads from the local log files. The client keeps its own
 * `daysToLoad` setting inside this limit.
 */
export const MAXIMUM_DAYS_TO_LOAD = 365;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** The `daysToLoad` setting of the client, kept inside the accepted range. */
export const clampDaysToLoad = (daysToLoad: number) =>
  Math.min(Math.max(daysToLoad, 0), MAXIMUM_DAYS_TO_LOAD);

/**
 * The filter on `eventAt` for the given window, for the queries of the
 * sharing. Undefined loads without a time limit, as the local parsing does.
 */
export const eventAtWindow = (daysToLoad: number) =>
  daysToLoad > 0
    ? { gte: new Date(Date.now() - daysToLoad * MILLISECONDS_PER_DAY) }
    : undefined;
