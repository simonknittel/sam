import type { LocalDate } from "@sam-monorepo/domain";
import { z } from "zod";

/**
 * Names the calendar date the seasonal themes resolve for, as `YYYY-MM-DD`.
 * The cookie bypasses the time zone of the viewer. The server honours it for
 * every viewer, because it changes nothing but the decorations of their own
 * view.
 */
export const SEASONAL_DATE_COOKIE = "seasonal-date";

export const SEASONAL_DATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** `YYYY-MM-DD` has exactly 10 characters */
export const SEASONAL_DATE_LENGTH = 10;

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
 * what a valid override is: everything but a real calendar date yields
 * nothing.
 */
export const parseSeasonalDateOverrideCookie = (
  cookieValue: string | undefined,
): LocalDate | null => {
  const result = cookieSchema.safeParse(cookieValue);
  if (!result.success) return null;

  const localDate = {
    year: Number(result.data.slice(0, 4)),
    month: Number(result.data.slice(5, 7)),
    day: Number(result.data.slice(8, 10)),
  };

  return isRealCalendarDate(localDate) ? localDate : null;
};

/** The cookie value which names the date */
export const formatSeasonalDateOverrideCookie = ({
  year,
  month,
  day,
}: LocalDate) =>
  [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
