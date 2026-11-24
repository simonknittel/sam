import { getLogAnalyzerWindowStart } from "@sam-monorepo/domain";

/** Undefined loads without a time limit */
export const getEventAtWindow = (daysToLoad: number, now: Date) => {
  const windowStart = getLogAnalyzerWindowStart(daysToLoad, now);
  return windowStart ? { gte: windowStart } : undefined;
};
