import {
  getLocalDate,
  ORGANIZATION_TIMEZONE,
  type LocalDate,
} from "./citizen/birthday.js";

/**
 * Prisma writes a `Date` into a `@db.Date` column as its UTC calendar day.
 * This returns the `Date` whose UTC calendar day is the given local date.
 * A day outside the month rolls over, thus day 0 is the last day of the
 * previous month.
 */
export const toDateColumnValue = ({ year, month, day }: LocalDate): Date =>
  new Date(Date.UTC(year, month - 1, day));

/**
 * The `@db.Date` value of the day before the given moment in the time zone
 * of the organization. The midnight jobs run in the first minutes of a day
 * and count the day that just ended.
 */
export const getYesterdayDateColumnValue = (moment: Date): Date => {
  const today = getLocalDate(moment, ORGANIZATION_TIMEZONE);

  return toDateColumnValue({ ...today, day: today.day - 1 });
};
