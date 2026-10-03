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

  return wallTimeAsUtc - instant;
};

const padNumber = (value: number, length: number) =>
  String(value).padStart(length, "0");

export interface LocalDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const formatLocalDateKey = ({ year, month, day }: LocalDate) =>
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
  formatLocalDateKey(getZonedDateTimeParts(instant, timeZone));

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

  /**
   * A zone changes its offset at most one time in these two days, thus only
   * the offsets one day before and one day after the wall time can apply.
   * The offset after the change wins if the wall time exists with it: this
   * gives the later instant in an overlap. Else the offset before the change
   * applies: this moves a wall time in a gap forward.
   */
  const offsetBefore = getOffsetMilliseconds(
    wallTimeAsUtc - MILLISECONDS_PER_DAY,
    timeZone,
  );
  const offsetAfter = getOffsetMilliseconds(
    wallTimeAsUtc + MILLISECONDS_PER_DAY,
    timeZone,
  );
  const instantWithOffsetAfter = wallTimeAsUtc - offsetAfter;
  if (getOffsetMilliseconds(instantWithOffsetAfter, timeZone) === offsetAfter)
    return new Date(instantWithOffsetAfter);

  return new Date(wallTimeAsUtc - offsetBefore);
};

/**
 * The `datetime-local` value ("YYYY-MM-DDTHH:mm") of the wall time of an
 * instant in the given IANA time zone. This is the inverse of
 * `wallTimeToInstant`, for example to fill in an edit form.
 */
export const instantToWallTime = (instant: Date, timeZone: string): string => {
  const parts = getZonedDateTimeParts(instant, timeZone);

  return `${formatLocalDateKey(parts)}T${padNumber(parts.hour, 2)}:${padNumber(parts.minute, 2)}`;
};
