/**
 * Conversions between an instant and the wall time of an IANA time zone.
 * They use only `Intl`, thus the result does not depend on the time zone of
 * the system, and the server and the browser get the same result.
 */

/**
 * The app shows dates and times in this zone. A rule that needs a zone uses
 * it when it has no zone of a citizen.
 */
export const ORGANIZATION_TIMEZONE = "Europe/Berlin";

/**
 * The format of a `datetime-local` value without seconds. A value with an
 * offset or a `Z` is an instant, not a wall time, thus it does not match.
 */
const WALL_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

interface ZonedDateTimeParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

/**
 * The construction of an `Intl.DateTimeFormat` is slow, thus each zone gets
 * one formatter. An unknown zone throws before it gets into the map.
 *
 * The key is the zone as the caller gives it. `Intl` accepts many spellings
 * of one zone (for example a different case), and each spelling gets its own
 * formatter. Thus a caller must give a zone from a fixed list or an
 * allowlist, never an unchecked value from a request.
 */
const formatterByTimeZone = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string): Intl.DateTimeFormat => {
  const cachedFormatter = formatterByTimeZone.get(timeZone);
  if (cachedFormatter) return cachedFormatter;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  formatterByTimeZone.set(timeZone, formatter);
  return formatter;
};

const getZonedDateTimeParts = (
  instant: Date | number,
  timeZone: string,
): ZonedDateTimeParts => {
  const parts = getFormatter(timeZone).formatToParts(instant);
  const readNumber = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: readNumber("year"),
    month: readNumber("month"),
    day: readNumber("day"),
    hour: readNumber("hour"),
    minute: readNumber("minute"),
    second: readNumber("second"),
  };
};

const getOffsetMilliseconds = (instant: number, timeZone: string): number => {
  const parts = getZonedDateTimeParts(instant, timeZone);
  const wallTimeAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  // The parts have no milliseconds, thus the instant also loses them
  const instantInWholeSeconds =
    instant - new Date(instant).getUTCMilliseconds();

  return wallTimeAsUtc - instantInWholeSeconds;
};

/**
 * The instant that a wall time in the fall-back overlap gives. The wall time
 * occurs two times in the overlap.
 */
enum OverlapInstant {
  /** The instant before the change. `Date` uses this rule. */
  Earlier = "earlier",
  /** The instant after the change, which is in standard time */
  Later = "later",
}

/**
 * The instant of a wall time in the given IANA time zone. `wallTimeAsUtc` is
 * the wall time as if the zone were UTC, thus the value of `Date.UTC` for the
 * parts of the wall time.
 *
 * A wall time in the spring-forward gap does not occur. It moves forward by
 * the length of the gap.
 */
const resolveWallTime = (
  wallTimeAsUtc: number,
  timeZone: string,
  overlapInstant: OverlapInstant,
): Date => {
  /**
   * A zone changes its offset at most one time in these two days, thus only
   * the offsets one day before and one day after the wall time can apply.
   * A wall time exists with an offset if the instant that it gives has this
   * offset. In the overlap, the wall time exists with both offsets. In the
   * gap, it exists with neither offset, and the offset before the change
   * moves it forward.
   */
  const offsetBefore = getOffsetMilliseconds(
    wallTimeAsUtc - MILLISECONDS_PER_DAY,
    timeZone,
  );
  const offsetAfter = getOffsetMilliseconds(
    wallTimeAsUtc + MILLISECONDS_PER_DAY,
    timeZone,
  );
  const instantWithOffsetBefore = wallTimeAsUtc - offsetBefore;
  const instantWithOffsetAfter = wallTimeAsUtc - offsetAfter;
  const existsWithOffsetBefore =
    getOffsetMilliseconds(instantWithOffsetBefore, timeZone) === offsetBefore;
  const existsWithOffsetAfter =
    getOffsetMilliseconds(instantWithOffsetAfter, timeZone) === offsetAfter;

  if (
    existsWithOffsetAfter &&
    (overlapInstant === OverlapInstant.Later || !existsWithOffsetBefore)
  )
    return new Date(instantWithOffsetAfter);

  return new Date(instantWithOffsetBefore);
};

const padNumber = (value: number, length: number) =>
  String(value).padStart(length, "0");

export interface LocalDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** The "YYYY-MM-DD" value of a calendar date */
export const toLocalDateKey = ({ year, month, day }: LocalDate) =>
  `${padNumber(year, 4)}-${padNumber(month, 2)}-${padNumber(day, 2)}`;

/**
 * The calendar date a moment falls on in the given IANA time zone. Throws
 * for a time zone the runtime does not know.
 */
export const getLocalDate = (moment: Date, timeZone: string): LocalDate => {
  const { year, month, day } = getZonedDateTimeParts(moment, timeZone);

  return { year, month, day };
};

/**
 * The calendar date ("YYYY-MM-DD") of an instant in the given IANA time zone.
 * Two instants are on the same day in the zone if their keys are equal, and
 * the order of the keys is the order of the days. Throws for a time zone the
 * runtime does not know.
 */
export const getLocalDateKey = (instant: Date, timeZone: string): string =>
  toLocalDateKey(getZonedDateTimeParts(instant, timeZone));

/**
 * Reads a `datetime-local` value ("YYYY-MM-DDTHH:mm") as a wall time in the
 * given IANA time zone and returns the instant. Throws for a value that is
 * not a valid date and time, and for a time zone the runtime does not know.
 * Also throws for the years 0000 to 0099, because `Date.UTC` reads them as
 * the years 1900 to 1999.
 *
 * Daylight saving time gives a deterministic result, independent of the
 * time zone of the system:
 * - A wall time in the spring-forward gap does not occur. It moves forward
 *   by the length of the gap. Example: 02:30 on 2026-03-29 in Europe/Berlin
 *   gives the instant of 03:30 summer time.
 * - A wall time in the fall-back overlap occurs two times. It gives the later
 *   instant, which is in standard time. Example: 02:30 on 2026-10-25 in
 *   Europe/Berlin gives the instant of 02:30 winter time.
 */
export const wallTimeToInstant = (wallTime: string, timeZone: string): Date => {
  const match = WALL_TIME_PATTERN.exec(wallTime);
  if (!match) throw new Error(`Invalid wall time: ${wallTime}`);

  const [matchedWallTime, year, month, day, hour, minute] = match;
  const wallTimeAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  // Date.UTC rolls a value out of range over, for example February 30
  if (new Date(wallTimeAsUtc).toISOString().slice(0, 16) !== matchedWallTime)
    throw new Error(`Invalid wall time: ${wallTime}`);

  return resolveWallTime(wallTimeAsUtc, timeZone, OverlapInstant.Later);
};

/**
 * The `datetime-local` value ("YYYY-MM-DDTHH:mm") of the wall time of an
 * instant in the given IANA time zone. This is the inverse of
 * `wallTimeToInstant`, for example to fill in an edit form.
 */
export const instantToWallTime = (instant: Date, timeZone: string): string => {
  const parts = getZonedDateTimeParts(instant, timeZone);

  return `${toLocalDateKey(parts)}T${padNumber(parts.hour, 2)}:${padNumber(parts.minute, 2)}`;
};

/**
 * The first instant of a calendar date in the given IANA time zone. Usually
 * this is midnight. If midnight is in the spring-forward gap, it is the end
 * of the gap. If midnight occurs two times, it is the earlier instant. A day
 * outside the month rolls over, like in `toDateColumnValue`. Throws for a
 * time zone the runtime does not know.
 */
export const getStartOfLocalDay = (
  { year, month, day }: LocalDate,
  timeZone: string,
): Date =>
  resolveWallTime(
    Date.UTC(year, month - 1, day),
    timeZone,
    OverlapInstant.Earlier,
  );

/**
 * The instant the given number of calendar days before an instant, with the
 * same wall time in the given IANA time zone. The result is the same as the
 * result of `Date#setDate(getDate() - days)` in a process that runs in this
 * zone, but it does not depend on the time zone of the process. Thus a
 * calendar day with a daylight-saving change has 23 or 25 hours:
 * - A wall time in the spring-forward gap moves forward by the length of the
 *   gap.
 * - A wall time in the fall-back overlap gives the earlier instant.
 *
 * Throws for a time zone the runtime does not know.
 */
export const subtractCalendarDays = (
  instant: Date,
  days: number,
  timeZone: string,
): Date => {
  const parts = getZonedDateTimeParts(instant, timeZone);

  return resolveWallTime(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day - days,
      parts.hour,
      parts.minute,
      parts.second,
      instant.getUTCMilliseconds(),
    ),
    timeZone,
    OverlapInstant.Earlier,
  );
};
