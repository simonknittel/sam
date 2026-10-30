import { Prisma } from "@sam-monorepo/database/client";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import {
  getNextBirthday,
  LISTED_BIRTHDAY_CITIZEN_WHERE,
  type NextBirthday,
} from "./birthdays.js";
import type { PickableCitizen } from "./listAllCitizens.js";

/** The search text is a part of a handle, thus a short limit is sufficient */
export const UPCOMING_BIRTHDAYS_HANDLE_QUERY_MAXIMUM_LENGTH = 100;

export const listUpcomingBirthdaysInputSchema = z.object({
  /** A part of the handle. Null or empty for all citizens. */
  handle_query: z
    .string()
    .max(UPCOMING_BIRTHDAYS_HANDLE_QUERY_MAXIMUM_LENGTH)
    .nullable(),
});

export type ListUpcomingBirthdaysInput = z.infer<
  typeof listUpcomingBirthdaysInputSchema
>;

/** Only the app uses it, thus the keys are camelCase */
export interface UpcomingBirthday extends NextBirthday {
  readonly citizen: PickableCitizen;
}

/**
 * Each citizen who filled in the birthday (see
 * `LISTED_BIRTHDAY_CITIZEN_WHERE`), with the next time it is celebrated. A
 * citizen appears exactly once: only the next birthday is in the list, never
 * the one of the year after.
 *
 * The birthday needs no permission of its own beyond `citizen;read`, the
 * same rule the citizen popover follows.
 */
export const listUpcomingBirthdays = (
  context: ApplicationContext,
  actor: Actor,
  input: ListUpcomingBirthdaysInput,
): Promise<UpcomingBirthday[]> =>
  withSpan(context, "listUpcomingBirthdays", async () => {
    requirePermission(actor, "citizen", "read");

    const citizens = await context.prisma.citizen.findMany({
      where: {
        AND: [
          LISTED_BIRTHDAY_CITIZEN_WHERE,
          ...(input.handle_query
            ? [
                {
                  handle: {
                    contains: input.handle_query,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        ...CITIZEN_REFERENCE_SELECT,
        birthdayDay: true,
        birthdayMonth: true,
      },
    });

    const now = context.now();

    return citizens
      .flatMap((citizen): UpcomingBirthday[] => {
        if (citizen.birthdayDay === null || citizen.birthdayMonth === null)
          return [];

        return [
          {
            citizen: {
              id: citizen.id,
              handle: citizen.handle,
              deletedAt: citizen.deletedAt,
            },
            ...getNextBirthday(citizen.birthdayDay, citizen.birthdayMonth, now),
          },
        ];
      })
      .toSorted(
        (first, second) =>
          first.daysUntil - second.daysUntil ||
          (first.citizen.handle || first.citizen.id).localeCompare(
            second.citizen.handle || second.citizen.id,
            "de",
          ),
      );
  });
