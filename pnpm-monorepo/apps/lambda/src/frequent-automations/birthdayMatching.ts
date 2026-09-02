/**
 * Decides whether a citizen has to be greeted right now. Which day the
 * birthday of a citizen falls on in their own time zone is the shared rule
 * `isBirthdayToday`; the "only once per local year" part below belongs to
 * the greeting job alone.
 */
import {
  getLocalDate,
  isBirthdayToday,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";

interface BirthdayCandidate {
  readonly timezone: string | null;
  readonly birthdayDay: number | null;
  readonly birthdayMonth: number | null;
  readonly birthdayGreetingSentAt: Date | null;
}

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
  if (!isBirthdayToday(candidate, now)) return false;

  if (!candidate.birthdayGreetingSentAt) return true;

  const hoursSinceGreeting =
    (now.getTime() - candidate.birthdayGreetingSentAt.getTime()) /
    MILLISECONDS_PER_HOUR;
  if (hoursSinceGreeting < MINIMUM_HOURS_BETWEEN_GREETINGS) return false;

  const timezone = candidate.timezone ?? ORGANIZATION_TIMEZONE;

  return (
    getLocalDate(candidate.birthdayGreetingSentAt, timezone).year !==
    getLocalDate(now, timezone).year
  );
};
