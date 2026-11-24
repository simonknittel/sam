import { isBirthdayToday, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import { hasGreetingInLocalYear } from "./greetingHistory.js";

export interface BirthdayGreetingCandidate {
  readonly timezone: string | null;
  readonly birthdayDay: number | null;
  readonly birthdayMonth: number | null;
  readonly birthdayGreetingSentAt: Date | null;
}

export const shouldGreetOnBirthday = (
  candidate: BirthdayGreetingCandidate,
  now: Date,
): boolean => {
  if (!isBirthdayToday(candidate, now)) return false;

  return !hasGreetingInLocalYear(
    candidate.birthdayGreetingSentAt,
    now,
    candidate.timezone ?? ORGANIZATION_TIMEZONE,
  );
};
