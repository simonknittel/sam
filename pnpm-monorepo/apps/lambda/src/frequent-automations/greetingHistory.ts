import { getLocalDate } from "@sam-monorepo/domain";

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
 * True while the marker of a greeting counts as "already sent this year".
 * Every greeting of this Lambda goes out once for each local year of the
 * citizen, thus the rule belongs to none of them alone. Throws for a time
 * zone the runtime does not know.
 */
export const hasGreetingInLocalYear = (
  greetingSentAt: Date | null,
  now: Date,
  timezone: string,
): boolean => {
  if (!greetingSentAt) return false;

  const hoursSinceGreeting =
    (now.getTime() - greetingSentAt.getTime()) / MILLISECONDS_PER_HOUR;
  if (hoursSinceGreeting < MINIMUM_HOURS_BETWEEN_GREETINGS) return true;

  return (
    getLocalDate(greetingSentAt, timezone).year ===
    getLocalDate(now, timezone).year
  );
};
