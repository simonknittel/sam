import { log } from "@/modules/logging";
import type { Entity } from "@sam-monorepo/database/client";
import { isBirthdayToday } from "@sam-monorepo/domain";

type BirthdayCitizen = Pick<
  Entity,
  "id" | "timezone" | "birthdayDay" | "birthdayMonth"
>;

/**
 * The same rule the greeting job of the Lambda applies, made safe for the
 * surfaces which only draw a party hat with it: the shared rule throws for a
 * time zone the runtime does not know, and neither a profile nor a session
 * must fail because of a decoration. Such a citizen gets no hat.
 */
export const hasBirthdayToday = (citizen: BirthdayCitizen, now: Date) => {
  try {
    return isBirthdayToday(citizen, now);
  } catch (error) {
    log.warn("Failed to check the birthday of a citizen", {
      citizenId: citizen.id,
      error,
    });

    return false;
  }
};
