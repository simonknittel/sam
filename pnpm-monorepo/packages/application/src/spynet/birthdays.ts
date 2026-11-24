import type { Citizen, Prisma } from "@sam-monorepo/database/client";
import {
  CAN_LOGIN_CITIZEN_WHERE,
  getCelebrationDate,
  getLocalDate,
  isBirthdayToday,
  ORGANIZATION_TIMEZONE,
  toDateColumnValue,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";

/**
 * Citizens who can no longer sign in are left out, but only approximately (see
 * `CAN_LOGIN_CITIZEN_WHERE`): the greeting job applies the exact rule
 * (`findClearedCitizens()`)
 */
export const LISTED_BIRTHDAY_CITIZEN_WHERE: Prisma.CitizenWhereInput = {
  /** `AND` composes the imported fragment without a key collision */
  AND: [
    { birthdayDay: { not: null }, birthdayMonth: { not: null } },
    CAN_LOGIN_CITIZEN_WHERE,
  ],
};

type BirthdayCitizen = Pick<
  Citizen,
  "id" | "timezone" | "birthdayDay" | "birthdayMonth"
>;

/**
 * The shared rule throws for a time zone the runtime does not know, and neither
 * a profile nor a session must fail because of a party hat. Such a citizen gets
 * no hat.
 */
export const hasBirthdayTodaySafely = (
  { log }: Pick<ApplicationContext, "log">,
  citizen: BirthdayCitizen,
  now: Date,
): boolean => {
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

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** February 29, which is celebrated on March 1 in a year without that day */
const LEAP_DAY = { birthdayDay: 29, birthdayMonth: 2 };

/**
 * The birthdays that can be today in some time zone, as a condition of the
 * query that loads the candidates. Time zones reach from UTC-12 to UTC+14,
 * thus the local day of a citizen is the day before, the current day or the
 * day after the one in UTC. The exact rule (`hasBirthdayTodaySafely`) runs
 * on each candidate; this only keeps the query small.
 */
export const getBirthdayCandidateDays = (now: Date) => [
  ...[-1, 0, 1].map((offsetInDays) => {
    const moment = new Date(
      now.getTime() + offsetInDays * MILLISECONDS_PER_DAY,
    );

    return {
      birthdayDay: moment.getUTCDate(),
      birthdayMonth: moment.getUTCMonth() + 1,
    };
  }),
  LEAP_DAY,
];

/**
 * The list of upcoming birthdays is the same for each viewer, thus it does
 * not read the day in the time zone of a citizen but in the one of the
 * organization. Midnight UTC of the date, thus whole days can be counted.
 */
const getDateInListTimezone = (moment: Date) =>
  toDateColumnValue(getLocalDate(moment, ORGANIZATION_TIMEZONE));

export interface NextBirthday {
  /** Midnight UTC of the day the birthday is celebrated next */
  readonly date: Date;
  readonly daysUntil: number;
}

export const getNextBirthday = (
  birthdayDay: number,
  birthdayMonth: number,
  now: Date,
): NextBirthday => {
  const today = getDateInListTimezone(now);

  const celebrationIn = (year: number) => {
    const celebration = getCelebrationDate(birthdayDay, birthdayMonth, year);
    return toDateColumnValue({ year, ...celebration });
  };

  const thisYear = celebrationIn(today.getUTCFullYear());
  const date =
    thisYear >= today ? thisYear : celebrationIn(today.getUTCFullYear() + 1);

  return {
    date,
    daysUntil: (date.getTime() - today.getTime()) / MILLISECONDS_PER_DAY,
  };
};
