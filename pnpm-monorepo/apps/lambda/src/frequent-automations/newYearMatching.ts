/**
 * Decides whether a citizen has to be greeted for the new year right now.
 * The app greets for the turn of the year on the same day, thus the day
 * rule lives in the seasonal calendar of the domain package and the two
 * cannot drift.
 */
import {
  getLocalDate,
  isSeasonalGreetingDay,
  ORGANIZATION_TIMEZONE,
  SeasonalEventKey,
} from "@sam-monorepo/domain";
import { hasGreetingInLocalYear } from "./greetingHistory";

interface NewYearCandidate {
  readonly timezone: string | null;
  readonly newYearGreetingSentAt: Date | null;
}

/**
 * True while the local date of the citizen is a greeting day of the New
 * Year event and they did not get a greeting in that local year yet. Throws
 * for a time zone the runtime does not know.
 */
export const shouldGreetCitizen = (
  candidate: NewYearCandidate,
  now: Date,
): boolean => {
  const timezone = candidate.timezone ?? ORGANIZATION_TIMEZONE;
  const today = getLocalDate(now, timezone);

  if (!isSeasonalGreetingDay(SeasonalEventKey.NewYear, today)) return false;

  return !hasGreetingInLocalYear(
    candidate.newYearGreetingSentAt,
    now,
    timezone,
  );
};
