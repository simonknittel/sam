/**
 * A citizen's birthday is stored as a day and a month without a year, thus
 * February 29 is always a valid day and no age can be calculated.
 */

export const BIRTHDAY_MONTH_MIN = 1;
export const BIRTHDAY_MONTH_MAX = 12;
export const BIRTHDAY_DAY_MIN = 1;

/** Index 0 is January. February has 29 days, because there is no year. */
const DAYS_PER_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const BIRTHDAY_DAY_MAX = Math.max(...DAYS_PER_MONTH);

export const getMaximumDayOfMonth = (month: number) =>
  DAYS_PER_MONTH[month - 1] ?? BIRTHDAY_DAY_MAX;

export const isValidBirthday = (day: number, month: number) =>
  Number.isInteger(month) &&
  month >= BIRTHDAY_MONTH_MIN &&
  month <= BIRTHDAY_MONTH_MAX &&
  Number.isInteger(day) &&
  day >= BIRTHDAY_DAY_MIN &&
  day <= getMaximumDayOfMonth(month);

/**
 * A leap year, so that February 29 can be formatted. The year is never
 * shown, and UTC keeps the date from moving across a day boundary.
 */
const FORMATTING_YEAR = 2000;

const toFormattableDate = (day: number, month: number) =>
  new Date(Date.UTC(FORMATTING_YEAR, month - 1, day));

const birthdayFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export const formatBirthday = (day: number, month: number) =>
  birthdayFormatter.format(toFormattableDate(day, month));

const monthFormatter = new Intl.DateTimeFormat("de-DE", {
  month: "long",
  timeZone: "UTC",
});

export const getMonthName = (month: number) =>
  monthFormatter.format(toFormattableDate(1, month));
