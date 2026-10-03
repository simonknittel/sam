/**
 * A citizen's birthday is stored as a day and a month without a year, see
 * the `Citizen` model. Both the greeting job of the Lambda and the surfaces
 * of the app must agree on the day a birthday falls on, thus the rule lives
 * here.
 */

import { getLocalDate, ORGANIZATION_TIMEZONE } from "../timeZone.js";

const FEBRUARY = 2;
const LEAP_DAY = 29;
const MARCH = 3;
const FIRST_DAY_OF_MONTH = 1;

const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

interface CelebrationDate {
  readonly month: number;
  readonly day: number;
}

/**
 * The day on which a birthday is celebrated in the given year. A birthday on
 * February 29 moves to March 1 in a year without a February 29.
 */
export const getCelebrationDate = (
  birthdayDay: number,
  birthdayMonth: number,
  year: number,
): CelebrationDate => {
  if (
    birthdayMonth === FEBRUARY &&
    birthdayDay === LEAP_DAY &&
    !isLeapYear(year)
  )
    return { month: MARCH, day: FIRST_DAY_OF_MONTH };

  return { month: birthdayMonth, day: birthdayDay };
};

interface BirthdayCitizen {
  readonly timezone: string | null;
  readonly birthdayDay: number | null;
  readonly birthdayMonth: number | null;
}

/**
 * True while the local day of the citizen is the day their birthday is
 * celebrated on. This is the rule behind the greeting of the Lambda and
 * behind the party hat which the app draws on the avatar, thus the two
 * cannot drift. Throws for a time zone the runtime does not know.
 */
export const isBirthdayToday = (
  citizen: BirthdayCitizen,
  now: Date,
): boolean => {
  if (citizen.birthdayDay === null || citizen.birthdayMonth === null)
    return false;

  const today = getLocalDate(now, citizen.timezone ?? ORGANIZATION_TIMEZONE);
  const celebration = getCelebrationDate(
    citizen.birthdayDay,
    citizen.birthdayMonth,
    today.year,
  );

  return today.month === celebration.month && today.day === celebration.day;
};
