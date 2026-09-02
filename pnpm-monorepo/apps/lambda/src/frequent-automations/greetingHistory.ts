import { getLocalDate } from "@sam-monorepo/domain";

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

/**
 * A citizen who moves their time zone shortly after a greeting can carry the
 * marker into the previous local year, which would earn them a second
 * greeting. A minimum distance closes that gap.
 *
 * The greeting window of one citizen is a single local day, thus two
 * greetings for the same date lie at most 24 hours plus the offset spread of
 * the two time zones apart. The allowlist of the app spans UTC-11
 * (Pacific/Niue) to UTC+14 (Pacific/Kiritimati), which makes 49 hours. The
 * value below keeps one hour of headroom for a zone further west entering
 * the time zone database.
 */
const MINIMUM_HOURS_BETWEEN_GREETINGS = 50;

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
