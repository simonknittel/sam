import {
  getCelebrationDate,
  getLocalDate,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** Midnight UTC of a calendar date, so that whole days can be counted. */
const toUtcMidnight = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day));

/**
 * The list of upcoming birthdays is the same for every viewer, thus it does
 * not read the day in the time zone of a citizen but in the one of the
 * organization.
 */
const getDateInListTimezone = (moment: Date) => {
  const today = getLocalDate(moment, ORGANIZATION_TIMEZONE);

  return toUtcMidnight(today.year, today.month, today.day);
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
