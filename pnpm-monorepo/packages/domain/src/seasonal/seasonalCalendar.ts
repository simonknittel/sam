/**
 * The calendar of the seasonal events. The app decorates its shell during
 * the theme range of an event and shows a greeting on the greeting days,
 * and the New Year greeting of the Lambda uses the same rule, thus the
 * ranges live here and cannot drift.
 *
 * Everything here is pure: the functions receive the local date of the
 * viewer and never read the clock.
 */
import type { LocalDate } from "../citizen/birthday.js";

/**
 * The key of a seasonal event. The app stores this string as the event key
 * of an opt-out row, thus a value must never change. A changed value would
 * turn every stored opt-out into the opt-out of an unknown event.
 */
export enum SeasonalEventKey {
  Halloween = "halloween",
  Christmas = "christmas",
  NewYear = "new-year",
}

interface MonthDay {
  readonly month: number;
  readonly day: number;
}

/**
 * A range of calendar days without a year. Both ends belong to the range,
 * and a range may cross the turn of the year.
 */
interface SeasonalDateRange {
  readonly start: MonthDay;
  readonly end: MonthDay;
}

export interface SeasonalEventDefinition {
  readonly key: SeasonalEventKey;
  /** The days the app carries the decorations and the hero font of the event */
  readonly themeRange: SeasonalDateRange;
  /** The days the app shows the greeting banner of the event */
  readonly greetingRange: SeasonalDateRange;
}

const JANUARY = 1;
const OCTOBER = 10;
const DECEMBER = 12;

/**
 * The definitions of the seasonal events. All ranges include both ends:
 *
 * - Halloween: theme October 1 to 31, greeting on October 31.
 * - Christmas: theme December 1 to 26, greeting December 24 to 26.
 * - New Year: theme December 27 to January 1, greeting on January 1.
 *
 * New Year starts on December 27, because it follows Christmas without a
 * gap: Christmas ends with the last holiday, and from the next day on the
 * app looks ahead to the turn of the year.
 *
 * The greeting range of an event is inside its theme range, and two theme
 * ranges never overlap. Unit tests assert both, so the app never has to
 * rank two active events.
 */
export const SEASONAL_EVENT_DEFINITIONS: Record<
  SeasonalEventKey,
  SeasonalEventDefinition
> = {
  [SeasonalEventKey.Halloween]: {
    key: SeasonalEventKey.Halloween,
    themeRange: {
      start: { month: OCTOBER, day: 1 },
      end: { month: OCTOBER, day: 31 },
    },
    greetingRange: {
      start: { month: OCTOBER, day: 31 },
      end: { month: OCTOBER, day: 31 },
    },
  },
  [SeasonalEventKey.Christmas]: {
    key: SeasonalEventKey.Christmas,
    themeRange: {
      start: { month: DECEMBER, day: 1 },
      end: { month: DECEMBER, day: 26 },
    },
    greetingRange: {
      start: { month: DECEMBER, day: 24 },
      end: { month: DECEMBER, day: 26 },
    },
  },
  [SeasonalEventKey.NewYear]: {
    key: SeasonalEventKey.NewYear,
    themeRange: {
      start: { month: DECEMBER, day: 27 },
      end: { month: JANUARY, day: 1 },
    },
    greetingRange: {
      start: { month: JANUARY, day: 1 },
      end: { month: JANUARY, day: 1 },
    },
  },
};

/**
 * A month/day pair as one number to compare, for example 1031 for
 * October 31. The factor keeps the day in the last two digits.
 */
const MONTH_FACTOR = 100;

const toComparableDay = ({ month, day }: MonthDay) =>
  month * MONTH_FACTOR + day;

const isInRange = (range: SeasonalDateRange, date: MonthDay) => {
  const value = toComparableDay(date);
  const start = toComparableDay(range.start);
  const end = toComparableDay(range.end);

  // A range which ends in the next year, for example December 27 to January 1
  if (start > end) return value >= start || value <= end;

  return value >= start && value <= end;
};

/** The event whose theme range holds the local date, or nothing */
export const getActiveSeasonalEvent = (
  localDate: LocalDate,
): SeasonalEventKey | null => {
  const activeDefinition = Object.values(SEASONAL_EVENT_DEFINITIONS).find(
    (definition) => isInRange(definition.themeRange, localDate),
  );

  return activeDefinition?.key ?? null;
};

/** True while the local date is a day the event shows its greeting on */
export const isSeasonalGreetingDay = (
  event: SeasonalEventKey,
  localDate: LocalDate,
): boolean =>
  isInRange(SEASONAL_EVENT_DEFINITIONS[event].greetingRange, localDate);

/**
 * The number of days a search for the next date looks at. One year holds
 * every month/day pair except February 29, and no range starts on that day.
 */
const SEARCH_DAY_COUNT = 366;

const addDays = (localDate: LocalDate, dayCount: number): LocalDate => {
  const moment = new Date(
    Date.UTC(localDate.year, localDate.month - 1, localDate.day + dayCount),
  );

  return {
    year: moment.getUTCFullYear(),
    month: moment.getUTCMonth() + 1,
    day: moment.getUTCDate(),
  };
};

/** The first date from `from` on, `from` included, which matches */
const findNextDate = (
  from: LocalDate,
  matches: (date: LocalDate) => boolean,
): LocalDate | null => {
  for (let offset = 0; offset < SEARCH_DAY_COUNT; offset += 1) {
    const date = addDays(from, offset);
    if (matches(date)) return date;
  }

  return null;
};

const isSameMonthDay = (date: MonthDay, other: MonthDay) =>
  date.month === other.month && date.day === other.day;

/** The next first day of the theme range of the event, `from` included */
export const getNextSeasonalThemeStart = (
  event: SeasonalEventKey,
  from: LocalDate,
): LocalDate | null =>
  findNextDate(from, (date) =>
    isSameMonthDay(date, SEASONAL_EVENT_DEFINITIONS[event].themeRange.start),
  );

/** The next first day of the greeting range of the event, `from` included */
export const getNextSeasonalGreetingStart = (
  event: SeasonalEventKey,
  from: LocalDate,
): LocalDate | null =>
  findNextDate(from, (date) =>
    isSameMonthDay(date, SEASONAL_EVENT_DEFINITIONS[event].greetingRange.start),
  );

/** The next day which no theme range holds, `from` included */
export const getNextDayWithoutSeasonalEvent = (
  from: LocalDate,
): LocalDate | null =>
  findNextDate(from, (date) => getActiveSeasonalEvent(date) === null);

export interface SeasonalEventOverlap extends MonthDay {
  readonly events: readonly SeasonalEventKey[];
}

/** The number of days of each month in a leap year, January first */
const DAYS_PER_MONTH_IN_LEAP_YEAR = [
  31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
];

/** Every day a range can hold, February 29 included */
const everyDayOfAYear = (): readonly MonthDay[] =>
  DAYS_PER_MONTH_IN_LEAP_YEAR.flatMap((dayCount, monthIndex) =>
    Array.from({ length: dayCount }, (unused, dayIndex) => ({
      month: monthIndex + 1,
      day: dayIndex + 1,
    })),
  );

/**
 * The days more than one theme range holds. `getActiveSeasonalEvent` takes
 * the first event of such a day, which would make the result depend on the
 * order of the definitions, thus a unit test asserts that this list stays
 * empty.
 */
export const findSeasonalEventOverlaps = (): readonly SeasonalEventOverlap[] =>
  everyDayOfAYear()
    .map((date) => ({
      ...date,
      events: Object.values(SEASONAL_EVENT_DEFINITIONS)
        .filter((definition) => isInRange(definition.themeRange, date))
        .map((definition) => definition.key),
    }))
    .filter((day) => day.events.length > 1);
