import { getLogAnalyzerWindowStart } from "@sam-monorepo/domain";

/**
 * The filter on `eventAt` for the given window, for the queries of the
 * sharing. Undefined loads without a time limit, as the local parsing does.
 */
export const getEventAtWindow = (daysToLoad: number, now: Date) => {
  const windowStart = getLogAnalyzerWindowStart(daysToLoad, now);
  return windowStart ? { gte: windowStart } : undefined;
};
