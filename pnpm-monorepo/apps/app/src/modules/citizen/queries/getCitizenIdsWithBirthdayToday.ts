import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { CAN_LOGIN_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { cache } from "react";
import { hasBirthdayToday } from "../utils/hasBirthdayToday";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** February 29, which is celebrated on March 1 in a year without that day */
const LEAP_DAY = { birthdayDay: 29, birthdayMonth: 2 };

/**
 * The days a local date can fall on. Time zones reach from UTC-12 to UTC+14,
 * thus the local day of a citizen is the day before, the current day or the
 * day after the one in UTC. The exact rule runs on each candidate below;
 * this only keeps the query small.
 */
const getCandidateDays = (now: Date) => [
  ...[-1, 0, 1].map((offsetInDays) => {
    const moment = new Date(now.getTime() + offsetInDays * ONE_DAY_MS);

    return {
      birthdayDay: moment.getUTCDate(),
      birthdayMonth: moment.getUTCMonth() + 1,
    };
  }),
  LEAP_DAY,
];

/**
 * Every citizen who has their birthday today, in their own time zone. The
 * app shell loads this once for each request and hands it to the browser, so
 * that a citizen link can wear the party hat without its own query — see
 * `BirthdayCitizensProvider`.
 *
 * Only the ids travel. The audience is the one of the birthday list: a
 * viewer without `citizen;read` gets nothing.
 */
export const getCitizenIdsWithBirthdayToday = cache(
  withTrace("getCitizenIdsWithBirthdayToday", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("citizen", "read"))) return [];

    const now = new Date();

    const candidates = await prisma.entity.findMany({
      where: {
        AND: [{ OR: getCandidateDays(now) }, CAN_LOGIN_CITIZEN_WHERE],
      },
      select: {
        id: true,
        timezone: true,
        birthdayDay: true,
        birthdayMonth: true,
      },
    });

    return candidates
      .filter((citizen) => hasBirthdayToday(citizen, now))
      .map((citizen) => citizen.id);
  }),
);
