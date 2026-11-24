/**
 * The app greets for the turn of the year on the same day, thus the day rule
 * lives in the seasonal calendar of the domain package
 */
import {
  getLocalDate,
  isSeasonalGreetingDay,
  ORGANIZATION_TIMEZONE,
  SeasonalEventKey,
} from "@sam-monorepo/domain";
import { hasGreetingInLocalYear } from "./greetingHistory.js";

export interface NewYearGreetingCandidate {
  readonly timezone: string | null;
  readonly newYearGreetingSentAt: Date | null;
}

export const shouldGreetForNewYear = (
  candidate: NewYearGreetingCandidate,
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
