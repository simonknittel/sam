import {
  CalendarEntryType,
  getBirthdayOccurrencesInRange,
  toLocalDateKey,
} from "@sam-monorepo/domain";
import { LISTED_BIRTHDAY_CITIZEN_WHERE } from "../spynet/birthdays.js";
import type {
  BirthdayCalendarEntry,
  CalendarEntryCollector,
} from "./calendarEntry.js";

/**
 * The birthdays of the citizens of the lists (see
 * `LISTED_BIRTHDAY_CITIZEN_WHERE`), each time they are celebrated in the
 * range. The birthday needs no permission of its own beyond `citizen;read`.
 */
export const birthdayEntryCollector: CalendarEntryCollector<BirthdayCalendarEntry> =
  {
    canRead: (actor) => actor.authorize("citizen", "read"),
    collect: async (context, actor, { range }) => {
      const citizens = await context.prisma.citizen.findMany({
        where: LISTED_BIRTHDAY_CITIZEN_WHERE,
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
          /** The list of the birthdays has the read rule of this entry */
          href: "/app/spynet/birthdays",
          citizen: { id: citizen.id, handle: citizen.handle },
        }));
      });
    },
  };
