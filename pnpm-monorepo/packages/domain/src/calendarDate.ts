import type { LocalDate } from "./citizen/birthday.js";

/**
 * Prisma writes a `Date` into a `@db.Date` column as its UTC calendar day.
 * This returns the `Date` whose UTC calendar day is the given local date.
 * A day outside the month rolls over, thus day 0 is the last day of the
 * previous month.
 */
export const toDateColumnValue = ({ year, month, day }: LocalDate): Date =>
  new Date(Date.UTC(year, month - 1, day));
