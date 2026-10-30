import {
  addDaysToLocalDate,
  fromDateColumnValue,
  toDateColumnValue,
} from "../calendarDate.js";
import type { LocalDate } from "../timeZone.js";

/**
 * A range of calendar days. Both ends belong to the range. The functions
 * here calculate on the date parts, thus the time zone of the system and the
 * length of a day around a daylight saving change do not affect them.
 */
export interface LocalDateRange {
  readonly start: LocalDate;
  readonly end: LocalDate;
}

/**
 * The longest range that one view of the calendar shows. The limit keeps the
 * queries and the loops over the days of a range bounded.
 */
export const MAXIMUM_CALENDAR_RANGE_MONTHS = 12;

/** Why the calendar refuses a range */
export enum CalendarRangeProblem {
  EndBeforeStart = "end_before_start",
  TooLong = "too_long",
}

const LOCAL_DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Moves a day outside its month into the next or the previous month */
const normalizeLocalDate = (date: LocalDate): LocalDate =>
  fromDateColumnValue(toDateColumnValue(date));

/**
 * Reads a "YYYY-MM-DD" value, for example a bound of the date filter in the
 * URL. Null for a value that names no day, for example February 30. The
 * inverse of `toLocalDateKey`.
 */
export const parseLocalDateKey = (value: string): LocalDate | null => {
  const match = LOCAL_DATE_KEY_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = { year: Number(year), month: Number(month), day: Number(day) };

  /**
   * `Date.UTC` rolls a value out of range over, and it reads the years 0 to
   * 99 as 1900 to 1999. Both change the date.
   */
  const normalized = normalizeLocalDate(date);
  if (
    normalized.year !== date.year ||
    normalized.month !== date.month ||
    normalized.day !== date.day
  )
    return null;

  return date;
};

/** Negative when `first` is before `second`, 0 for the same day */
export const compareLocalDates = (first: LocalDate, second: LocalDate) =>
  toDateColumnValue(first).getTime() - toDateColumnValue(second).getTime();

export const isLocalDateInRange = (date: LocalDate, range: LocalDateRange) =>
  compareLocalDates(date, range.start) >= 0 &&
  compareLocalDates(date, range.end) <= 0;

/**
 * Each day of the range, the first day first. The caller limits the length of
 * the range (see `findCalendarRangeProblem`).
 */
export const getLocalDatesOfRange = (range: LocalDateRange): LocalDate[] => {
  const dates: LocalDate[] = [];

  for (
    let date = range.start;
    compareLocalDates(date, range.end) <= 0;
    date = addDaysToLocalDate(date, 1)
  )
    dates.push(date);

  return dates;
};

/**
 * Why the calendar cannot show the range, or null. A range can start and end
 * at any distance from today, but it can hold at most
 * `MAXIMUM_CALENDAR_RANGE_MONTHS` months: the end can be the same day of the
 * month 12 months after the start, but not a later day.
 */
export const findCalendarRangeProblem = (
  range: LocalDateRange,
): CalendarRangeProblem | null => {
  if (compareLocalDates(range.end, range.start) < 0)
    return CalendarRangeProblem.EndBeforeStart;

  const latestEnd = normalizeLocalDate({
    ...range.start,
    month: range.start.month + MAXIMUM_CALENDAR_RANGE_MONTHS,
  });
  if (compareLocalDates(range.end, latestEnd) > 0)
    return CalendarRangeProblem.TooLong;

  return null;
};
