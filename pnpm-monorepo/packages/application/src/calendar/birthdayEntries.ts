import {
  CalendarEntryType,
  CAN_LOGIN_CITIZEN_WHERE,
  getBirthdayOccurrencesInRange,
  toLocalDateKey,
} from "@sam-monorepo/domain";
import type {
  BirthdayCalendarEntry,
  CalendarEntryCollector,
} from "./calendarEntry.js";

/**
 * The birthdays of the citizens, each time they are celebrated in the range.
 * Citizens who can no longer sign in are left out, the same rule as the list
 * of the upcoming birthdays and the greeting job. The birthday needs no
 * permission of its own beyond `citizen;read`.
 */
export const birthdayEntryCollector: CalendarEntryCollector<BirthdayCalendarEntry> =
  {
    canRead: (actor) => actor.authorize("citizen", "read"),
    collect: async (context, actor, { range }) => {
      const citizens = await context.prisma.citizen.findMany({
        /** `AND` composes the imported fragment without a key collision */
        where: {
          AND: [
            { birthdayDay: { not: null }, birthdayMonth: { not: null } },
            CAN_LOGIN_CITIZEN_WHERE,
          ],
        },
        select: {
          id: true,
          handle: true,
          birthdayDay: true,
          birthdayMonth: true,
        },
      });

      return citizens.flatMap((citizen) => {
        if (citizen.birthdayDay === null || citizen.birthdayMonth === null)
          return [];

        return getBirthdayOccurrencesInRange(
          citizen.birthdayDay,
          citizen.birthdayMonth,
          range,
        ).map((date) => ({
          type: CalendarEntryType.Birthday,
          key: `birthday:${citizen.id}:${toLocalDateKey(date)}`,
          date,
          time: null,
          href: `/app/spynet/citizen/${citizen.id}`,
          citizen: { id: citizen.id, handle: citizen.handle },
        }));
      });
    },
  };
