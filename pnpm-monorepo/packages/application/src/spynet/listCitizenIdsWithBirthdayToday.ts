import { CAN_LOGIN_CITIZEN_WHERE } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  getBirthdayCandidateDays,
  hasBirthdayTodaySafely,
} from "./birthdays.js";

/**
 * Only the ids go out. The app shell loads them one time for each request, like
 * `listCitizenAvatarUrls()`.
 */
export const listCitizenIdsWithBirthdayToday = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<string[]> => {
  if (!actor.authorize("citizen", "read")) return [];

  const now = context.now();

  const candidates = await context.prisma.citizen.findMany({
    where: {
      AND: [{ OR: getBirthdayCandidateDays(now) }, CAN_LOGIN_CITIZEN_WHERE],
    },
    select: {
      id: true,
      timezone: true,
      birthdayDay: true,
      birthdayMonth: true,
    },
  });

  return candidates
    .filter((citizen) => hasBirthdayTodaySafely(context, citizen, now))
    .map((citizen) => citizen.id);
};
