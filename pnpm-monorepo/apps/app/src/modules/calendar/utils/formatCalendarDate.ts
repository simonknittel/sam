import {
  ORGANIZATION_TIMEZONE,
  toDateColumnValue,
  type LocalDate,
} from "@sam-monorepo/domain";

/**
 * A calendar day as German text, for example "Freitag, 30. Oktober 2026".
 * The day has no time zone: the text uses the midnight UTC of the day, read
 * in UTC.
 */
export const formatCalendarDay = (date: LocalDate) =>
  toDateColumnValue(date).toLocaleDateString("de-DE", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** The wall time of a moment in the time zone of the organization, for example "20:00 Uhr" */
export const formatCalendarTime = (moment: Date) =>
  `${moment.toLocaleTimeString("de-DE", {
    timeZone: ORGANIZATION_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
