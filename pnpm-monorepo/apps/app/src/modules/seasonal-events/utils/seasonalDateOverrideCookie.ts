import type { LocalDate } from "@sam-monorepo/domain";
import { z } from "zod";

/**
 * Names the calendar date the seasonal themes resolve for, as `YYYY-MM-DD`.
 * The cookie bypasses the time zone of the viewer and is only honoured while
 * `SEASONAL_DATE_OVERRIDE_ENABLED` is set, thus it belongs to development
 * and to the test stack.
 */
export const SEASONAL_DATE_COOKIE = "seasonal-date";

/** `YYYY-MM-DD` has exactly 10 characters */
const SEASONAL_DATE_LENGTH = 10;

const cookieSchema = z
  .string()
  .max(SEASONAL_DATE_LENGTH)
  .regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Whether the parts name a day the calendar has. `Date.UTC` accepts
 * February 30 and moves it to March 2, thus the parts must come back
 * unchanged.
 */
const isRealCalendarDate = ({ year, month, day }: LocalDate) => {
  const moment = new Date(Date.UTC(year, month - 1, day));

  return (
    moment.getUTCFullYear() === year &&
    moment.getUTCMonth() + 1 === month &&
    moment.getUTCDate() === day
  );
};

/**
 * The date the cookie names, or nothing. This is the one place which decides
 * what a valid override is: everything but a real calendar date, and every
 * value while the override is switched off, yields nothing.
 */
export const parseSeasonalDateOverrideCookie = (
  cookieValue: string | undefined,
  overrideEnabled: boolean,
): LocalDate | null => {
  if (!overrideEnabled) return null;

  const result = cookieSchema.safeParse(cookieValue);
  if (!result.success) return null;

  const localDate = {
    year: Number(result.data.slice(0, 4)),
    month: Number(result.data.slice(5, 7)),
    day: Number(result.data.slice(8, 10)),
  };

  return isRealCalendarDate(localDate) ? localDate : null;
};
