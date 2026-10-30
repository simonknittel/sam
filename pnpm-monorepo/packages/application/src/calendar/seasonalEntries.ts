import {
  CalendarEntryType,
  getSeasonalGreetingDaysInRange,
  toLocalDateKey,
} from "@sam-monorepo/domain";
import type {
  CalendarEntryCollector,
  SeasonalCalendarEntry,
} from "./calendarEntry.js";

/**
 * The greeting days of the seasonal events. Each actor sees them, also with
 * the theme of the event switched off.
 */
export const seasonalEntryCollector: CalendarEntryCollector<SeasonalCalendarEntry> =
  {
    canRead: () => true,
    collect: async (context, actor, { range }) =>
      getSeasonalGreetingDaysInRange(range).map(({ date, event }) => ({
        type: CalendarEntryType.Seasonal,
        key: `seasonal:${event}:${toLocalDateKey(date)}`,
        date,
        time: null,
        href: null,
        event,
      })),
  };
