import {
  addDaysToLocalDate,
  CALENDAR_ENTRY_TYPES,
  CalendarRangeProblem,
  compareLocalDates,
  findCalendarRangeProblem,
  getStartOfLocalDay,
  ORGANIZATION_TIMEZONE,
  type LocalDateRange,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import type { CalendarEntry, CalendarQuery } from "./calendarEntry.js";
import { CALENDAR_ENTRY_COLLECTORS } from "./calendarEntryCollectors.js";
import { findOwnCalendarEntryTypeSettings } from "./findOwnCalendarEntryTypeSettings.js";

export enum CalendarErrorMessage {
  /** A `ValidationError` */
  RangeEndBeforeStart = "The end of the range is before its start",
  /** A `ValidationError` */
  RangeTooLong = "The range is longer than 12 months",
}

const RANGE_PROBLEM_MESSAGES: Record<
  CalendarRangeProblem,
  CalendarErrorMessage
> = {
  [CalendarRangeProblem.EndBeforeStart]:
    CalendarErrorMessage.RangeEndBeforeStart,
  [CalendarRangeProblem.TooLong]: CalendarErrorMessage.RangeTooLong,
};

export interface FindCalendarEntriesInput {
  readonly range: LocalDateRange;
  /**
   * Also the events that started before the range and did not end yet. The
   * dashboard tile shows them.
   */
  readonly includeRunningEvents?: boolean;
}

const TYPE_ORDER = new Map(
  CALENDAR_ENTRY_TYPES.map((type, index) => [type, index]),
);

/**
 * By the day. In a day, the entries of the whole day come first, then the
 * entries with a time by the time. Entries with the same day and time keep
 * the order of the type filter.
 */
const compareCalendarEntries = (first: CalendarEntry, second: CalendarEntry) =>
  compareLocalDates(first.date, second.date) ||
  Number(first.time !== null) - Number(second.time !== null) ||
  (first.time?.getTime() ?? 0) - (second.time?.getTime() ?? 0) ||
  (TYPE_ORDER.get(first.type) ?? 0) - (TYPE_ORDER.get(second.type) ?? 0) ||
  first.key.localeCompare(second.key);

/**
 * The entries of the calendar in the range that the actor can see, sorted
 * (see `compareCalendarEntries`). Only the collectors of the types that the
 * actor can read and did not switch off run (see
 * `findOwnCalendarEntryTypeSettings`).
 *
 * @throws ValidationError for a range that ends before its start or that is
 * longer than 12 months (see `findCalendarRangeProblem`)
 */
export const findCalendarEntries = (
  context: ApplicationContext,
  actor: Actor,
  { range, includeRunningEvents = false }: FindCalendarEntriesInput,
): Promise<CalendarEntry[]> =>
  withSpan(context, "findCalendarEntries", async () => {
    const rangeProblem = findCalendarRangeProblem(range);
    if (rangeProblem)
      throw new ValidationError(RANGE_PROBLEM_MESSAGES[rangeProblem]);

    const query: CalendarQuery = {
      range,
      from: getStartOfLocalDay(range.start, ORGANIZATION_TIMEZONE),
      until: getStartOfLocalDay(
        addDaysToLocalDate(range.end, 1),
        ORGANIZATION_TIMEZONE,
      ),
      includeRunningEvents,
    };

    const settings = await findOwnCalendarEntryTypeSettings(context, actor);
    const entriesByType = await Promise.all(
      settings
        .filter((setting) => setting.enabled)
        .map((setting) =>
          CALENDAR_ENTRY_COLLECTORS[setting.type].collect(
            context,
            actor,
            query,
          ),
        ),
    );

    return entriesByType.flat().toSorted(compareCalendarEntries);
  });
