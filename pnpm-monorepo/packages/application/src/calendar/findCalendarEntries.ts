import {
  addDaysToLocalDate,
  CALENDAR_ENTRY_TYPES,
  CalendarEntryType,
  CalendarListStatus,
  CalendarRangeProblem,
  compareLocalDates,
  findCalendarRangeProblem,
  getEventEndTime,
  getLocalDate,
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
   * Upcoming: the entries of the range that did not finish. When the range
   * starts today or earlier, also the events that started before the range
   * and still run. Past: the entries of the range that finished. Without a
   * status: all entries of the range.
   */
  readonly status?: CalendarListStatus;
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
 * An entry of the whole day finishes at the end of its day, an event at its
 * end (see `getEventEndTime`). Each other entry is a point in time.
 */
const hasEntryFinished = (entry: CalendarEntry, now: Date) => {
  if (!entry.time)
    return (
      compareLocalDates(entry.date, getLocalDate(now, ORGANIZATION_TIMEZONE)) <
      0
    );

  const endTime =
    entry.type === CalendarEntryType.Event
      ? getEventEndTime(entry.event)
      : entry.time;

  return endTime <= now;
};

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
  { range, status }: FindCalendarEntriesInput,
): Promise<CalendarEntry[]> =>
  withSpan(context, "findCalendarEntries", async () => {
    const rangeProblem = findCalendarRangeProblem(range);
    if (rangeProblem)
      throw new ValidationError(RANGE_PROBLEM_MESSAGES[rangeProblem]);

    const now = context.now();
    const rangeStart = getStartOfLocalDay(range.start, ORGANIZATION_TIMEZONE);

    const query: CalendarQuery = {
      range,
      from: rangeStart,
      until: getStartOfLocalDay(
        addDaysToLocalDate(range.end, 1),
        ORGANIZATION_TIMEZONE,
      ),
      /** A later page of the list must not show the running events again */
      includeRunningEvents:
        status === CalendarListStatus.Upcoming && rangeStart <= now,
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

    const entries = status
      ? entriesByType
          .flat()
          .filter(
            (entry) =>
              hasEntryFinished(entry, now) ===
              (status === CalendarListStatus.Past),
          )
      : entriesByType.flat();

    return entries.toSorted(compareCalendarEntries);
  });
