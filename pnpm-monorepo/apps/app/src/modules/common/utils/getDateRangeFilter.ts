import { fromZonedTime } from "date-fns-tz";

/** The zone every timestamp in the app is rendered in (see formatDate) */
const DISPLAY_TIME_ZONE = "Europe/Berlin";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The calendar day after the given one. Done on the date parts rather than by
 * adding 24 hours to an instant, because the days around a daylight saving
 * change are 23 and 25 hours long.
 */
const nextCalendarDay = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
};

const startOfDayInDisplayZone = (value?: string | null) => {
  if (!value || !ISO_DATE_PATTERN.test(value)) return undefined;
  const date = fromZonedTime(`${value}T00:00:00`, DISPLAY_TIME_ZONE);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/**
 * Turns the `YYYY-MM-DD` bounds of a date filter into the instants they name
 * in the zone the table is read in. Picking a day has to cover that whole day
 * as it appears in the table, so `to` resolves to the start of the following
 * day and is compared exclusively.
 *
 * A missing or malformed bound is dropped rather than throwing: these come
 * from the URL and are trivially editable.
 */
export const getDateRangeFilter = (
  from?: string | null,
  to?: string | null,
) => {
  const gte = startOfDayInDisplayZone(from);

  const lt =
    to && ISO_DATE_PATTERN.test(to)
      ? startOfDayInDisplayZone(nextCalendarDay(to))
      : undefined;

  return {
    ...(gte ? { gte } : {}),
    ...(lt ? { lt } : {}),
  };
};
