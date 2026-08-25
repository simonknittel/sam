/**
 * Decides whether a citizen has their birthday right now, in their own time
 * zone. The birthday is stored as a day and a month without a year, see the
 * `Entity` model.
 */

/** Citizens without a time zone are greeted at midnight in this zone. */
const DEFAULT_TIMEZONE = "Europe/Berlin";

interface BirthdayCandidate {
  readonly timezone: string | null;
  readonly birthdayDay: number | null;
  readonly birthdayMonth: number | null;
  readonly birthdayGreetingSentAt: Date | null;
}

interface LocalDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** Throws for a time zone the runtime does not know. */
const getLocalDate = (moment: Date, timezone: string): LocalDate => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(moment);

  const readNumber = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: readNumber("year"),
    month: readNumber("month"),
    day: readNumber("day"),
  };
};

const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const FEBRUARY = 2;
const LEAP_DAY = 29;
const MARCH = 3;
const FIRST_DAY_OF_MONTH = 1;

/**
 * The day on which a birthday is celebrated in the given year. A birthday on
 * February 29 moves to March 1 in a year without a February 29.
 */
const getCelebrationDate = (
  birthdayDay: number,
  birthdayMonth: number,
  year: number,
) => {
  if (
    birthdayMonth === FEBRUARY &&
    birthdayDay === LEAP_DAY &&
    !isLeapYear(year)
  )
    return { month: MARCH, day: FIRST_DAY_OF_MONTH };

  return { month: birthdayMonth, day: birthdayDay };
};

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

/**
 * The greeting window of one citizen is a single local day, thus two
 * greetings can only ever land within little more than one day of each
 * other. This happens when the citizen moves their time zone across the turn
 * of the year shortly after a greeting: the same marker then falls into the
 * previous local year. A minimum distance closes that gap.
 */
const MINIMUM_HOURS_BETWEEN_GREETINGS = 48;

/**
 * True while it is the birthday of the citizen in their time zone and they
 * did not get a greeting in that local year yet.
 */
export const shouldGreetCitizen = (
  candidate: BirthdayCandidate,
  now: Date,
): boolean => {
  if (candidate.birthdayDay === null || candidate.birthdayMonth === null)
    return false;

  const timezone = candidate.timezone ?? DEFAULT_TIMEZONE;
  const today = getLocalDate(now, timezone);
  const celebration = getCelebrationDate(
    candidate.birthdayDay,
    candidate.birthdayMonth,
    today.year,
  );

  if (today.month !== celebration.month || today.day !== celebration.day)
    return false;

  if (!candidate.birthdayGreetingSentAt) return true;

  const hoursSinceGreeting =
    (now.getTime() - candidate.birthdayGreetingSentAt.getTime()) /
    MILLISECONDS_PER_HOUR;
  if (hoursSinceGreeting < MINIMUM_HOURS_BETWEEN_GREETINGS) return false;

  return (
    getLocalDate(candidate.birthdayGreetingSentAt, timezone).year !== today.year
  );
};
