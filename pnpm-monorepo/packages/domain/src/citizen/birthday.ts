/**
 * A citizen's birthday is stored as a day and a month without a year, see
 * the `Entity` model. Both the greeting job of the Lambda and the list of
 * upcoming birthdays in the app must agree on the day a birthday falls on,
 * thus the rule lives here.
 */

const FEBRUARY = 2;
const LEAP_DAY = 29;
const MARCH = 3;
const FIRST_DAY_OF_MONTH = 1;

export const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

export interface CelebrationDate {
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
