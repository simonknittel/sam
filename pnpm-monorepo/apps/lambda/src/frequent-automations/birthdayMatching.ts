/**
 * Decides whether a citizen has to be greeted right now. Which day the
 * birthday of a citizen falls on in their own time zone is the shared rule
 * `isBirthdayToday`; the "only once per local year" part is the shared rule
 * of every greeting of this Lambda.
 */
import { isBirthdayToday, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import { hasGreetingInLocalYear } from "./greetingHistory";

interface BirthdayCandidate {
  readonly timezone: string | null;
  readonly birthdayDay: number | null;
  readonly birthdayMonth: number | null;
  readonly birthdayGreetingSentAt: Date | null;
}

/**
 * True while it is the birthday of the citizen in their time zone and they
 * did not get a greeting in that local year yet.
 */
export const shouldGreetCitizen = (
  candidate: BirthdayCandidate,
  now: Date,
): boolean => {
  if (!isBirthdayToday(candidate, now)) return false;

  return !hasGreetingInLocalYear(
    candidate.birthdayGreetingSentAt,
    now,
    candidate.timezone ?? ORGANIZATION_TIMEZONE,
  );
};
