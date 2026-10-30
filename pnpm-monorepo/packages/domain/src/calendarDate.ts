import {
  getLocalDate,
  ORGANIZATION_TIMEZONE,
  type LocalDate,
} from "./timeZone.js";

/**
 * Prisma writes a `Date` into a `@db.Date` column as its UTC calendar day.
 * This returns the `Date` whose UTC calendar day is the given local date.
 * A day outside the month rolls over, thus day 0 is the last day of the
 * previous month.
 */
export const toDateColumnValue = ({ year, month, day }: LocalDate): Date =>
  new Date(Date.UTC(year, month - 1, day));

/** The calendar date of a `@db.Date` value, the inverse of `toDateColumnValue` */
export const fromDateColumnValue = (value: Date): LocalDate => ({
  year: value.getUTCFullYear(),
  month: value.getUTCMonth() + 1,
  day: value.getUTCDate(),
});

/**
 * The calendar date the given number of days after the date, or before it
 * for a negative number. It calculates on the date parts, thus the length of
 * a day around a daylight saving change does not affect it.
 */
export const addDaysToLocalDate = (date: LocalDate, days: number): LocalDate =>
  fromDateColumnValue(toDateColumnValue({ ...date, day: date.day + days }));

/**
 * The `@db.Date` value of the day before the given moment in the time zone
 * of the organization. The midnight jobs run in the first minutes of a day
 * and count the day that just ended.
 */
export const getYesterdayDateColumnValue = (moment: Date): Date => {
  const today = getLocalDate(moment, ORGANIZATION_TIMEZONE);

  return toDateColumnValue({ ...today, day: today.day - 1 });
};
