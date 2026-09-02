/**
 * Decides whether a citizen has to be greeted for the new year right now.
 * The app celebrates nothing for the turn of the year, thus the day rule
 * lives here and not in the domain package.
 */
import { getLocalDate, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import { hasGreetingInLocalYear } from "./greetingHistory";

const JANUARY = 1;
const FIRST_DAY_OF_MONTH = 1;

interface NewYearCandidate {
  readonly timezone: string | null;
  readonly newYearGreetingSentAt: Date | null;
}

/**
 * True while the local date of the citizen is January 1 and they did not get
 * a greeting in that local year yet. Throws for a time zone the runtime does
 * not know.
 */
export const shouldGreetCitizen = (
  candidate: NewYearCandidate,
  now: Date,
): boolean => {
  const timezone = candidate.timezone ?? ORGANIZATION_TIMEZONE;
  const today = getLocalDate(now, timezone);

  if (today.month !== JANUARY || today.day !== FIRST_DAY_OF_MONTH) return false;

  return !hasGreetingInLocalYear(
    candidate.newYearGreetingSentAt,
    now,
    timezone,
  );
};
