/**
 * Decides whether a citizen has their birthday right now, in their own time
 * zone. Which day a birthday falls on is the shared rule
 * `getCelebrationDate`.
 */
import { getCelebrationDate } from "@sam-monorepo/domain";

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
