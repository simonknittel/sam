import { getCelebrationDate } from "@sam-monorepo/domain";

/**
 * The list of upcoming birthdays is the same for every viewer, thus it does
 * not use the time zone of a citizen but the one of the organization.
 */
export const BIRTHDAY_LIST_TIMEZONE = "Europe/Berlin";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** Midnight UTC of a calendar date, so that whole days can be counted. */
const toUtcMidnight = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day));

const getDateInListTimezone = (moment: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BIRTHDAY_LIST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(moment);

  const readNumber = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return toUtcMidnight(
    readNumber("year"),
    readNumber("month"),
    readNumber("day"),
  );
};

interface NextBirthday {
  /** Midnight UTC of the day the birthday is celebrated next */
  readonly date: Date;
  /** Whole days from today, thus 0 while the birthday is today */
  readonly daysUntil: number;
}

/**
 * The next time a birthday is celebrated, today included. Every citizen
 * therefore appears exactly once in the list, with the occurrence which is
 * still ahead.
 */
export const getNextBirthday = (
  birthdayDay: number,
  birthdayMonth: number,
  now: Date,
): NextBirthday => {
  const today = getDateInListTimezone(now);

  const celebrationIn = (year: number) => {
    const celebration = getCelebrationDate(birthdayDay, birthdayMonth, year);
    return toUtcMidnight(year, celebration.month, celebration.day);
  };

  const thisYear = celebrationIn(today.getUTCFullYear());
  const date =
    thisYear >= today ? thisYear : celebrationIn(today.getUTCFullYear() + 1);

  return {
    date,
    daysUntil: (date.getTime() - today.getTime()) / MILLISECONDS_PER_DAY,
  };
};
