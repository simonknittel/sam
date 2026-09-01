/**
 * The longest window the shared entries query accepts, well above the 14 days
 * the Log Analyzer reads from the local log files. The client keeps its own
 * `daysToLoad` setting inside this limit.
 */
export const MAXIMUM_DAYS_TO_LOAD = 365;
