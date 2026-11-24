import type { LocalDate } from "@sam-monorepo/domain";
import * as z from "zod";

/**
 * The format is `YYYY-MM-DD`. The cookie bypasses the time zone of the viewer.
 * The server honours it for every viewer, because it changes nothing but the
 * decorations of their own view.
 */
export const SEASONAL_DATE_COOKIE = "seasonal-date";

export const SEASONAL_DATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/** February 30 does not pass */
export const seasonalDateSchema = z.iso.date();

export const parseSeasonalDateOverrideCookie = (
  cookieValue: string | undefined,
): LocalDate | null => {
  const result = seasonalDateSchema.safeParse(cookieValue);
  if (!result.success) return null;

  return {
    year: Number(result.data.slice(0, 4)),
    month: Number(result.data.slice(5, 7)),
    day: Number(result.data.slice(8, 10)),
  };
};

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
