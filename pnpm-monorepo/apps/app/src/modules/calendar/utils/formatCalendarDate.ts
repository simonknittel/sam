import {
  ORGANIZATION_TIMEZONE,
  toDateColumnValue,
  type LocalDate,
} from "@sam-monorepo/domain";

export enum CalendarDayStyle {
  /** Example: "30.10.2026" */
  Numeric = "numeric",
  /** Example: "Fr., 30. Oktober" */
  Short = "short",
  /** Example: "Freitag, 30. Oktober 2026" */
  Long = "long",
}

const OPTIONS_BY_DAY_STYLE = {
  [CalendarDayStyle.Numeric]: {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  },
  [CalendarDayStyle.Short]: {
    weekday: "short",
    day: "numeric",
    month: "long",
  },
  [CalendarDayStyle.Long]: {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  },
} satisfies Record<CalendarDayStyle, Intl.DateTimeFormatOptions>;

/**
 * A calendar day as German text. The day has no time zone: the text uses the
 * midnight UTC of the day, read in UTC.
 */
export const formatCalendarDay = (date: LocalDate, style: CalendarDayStyle) =>
  toDateColumnValue(date).toLocaleDateString("de-DE", {
    timeZone: "UTC",
    ...OPTIONS_BY_DAY_STYLE[style],
  });

/** The wall time of a moment in the time zone of the organization, for example "20:00 Uhr" */
export const formatCalendarTime = (moment: Date) =>
  `${moment.toLocaleTimeString("de-DE", {
    timeZone: ORGANIZATION_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
