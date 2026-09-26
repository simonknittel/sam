import type { IEntry } from "./PATTERNS";

/**
 * The start of the window which the `daysToLoad` setting gives: the start of
 * the day `daysToLoad` days before today. Null when the window has no limit.
 */
export const getWindowStart = (daysToLoad: number) => {
  if (daysToLoad <= 0) return null;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - daysToLoad);
  windowStart.setHours(0, 0, 0, 0);
  return windowStart;
};

/**
 * Removes the entries, own and shared, which are older than the window. The
 * window moves on while the page stays open, for example in live mode.
 */
export const deleteEntriesBefore = (
  entries: Map<string, IEntry>,
  windowStart: Date | null,
) => {
  if (!windowStart) return;

  for (const [key, entry] of entries) {
    if (entry.isoDate < windowStart) entries.delete(key);
  }
};
