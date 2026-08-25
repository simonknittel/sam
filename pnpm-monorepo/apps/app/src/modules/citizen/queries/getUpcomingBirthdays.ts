import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { Prisma } from "@sam-monorepo/database/client";
import { CAN_LOGIN_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getNextBirthday } from "../utils/upcomingBirthdays";

/**
 * Every citizen who filled in their birthday, with the next time it is
 * celebrated. A citizen appears exactly once: only their next birthday is in
 * the list, never the one of the year after.
 *
 * Citizens who can no longer sign in are left out, the same condition the
 * greeting job applies. Thus the list holds no birthday which never gets a
 * greeting.
 *
 * The birthday needs no permission of its own beyond `citizen;read`, the
 * same rule the citizen popover follows.
 */
export const getUpcomingBirthdays = cache(
  withTrace(
    "getUpcomingBirthdays",
    async (handleQuery: string | null = null) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("citizen", "read"))) forbidden();

      const citizens = await prisma.entity.findMany({
        /** `AND` composes the imported fragment without a key collision */
        where: {
          AND: [
            { birthdayDay: { not: null }, birthdayMonth: { not: null } },
            CAN_LOGIN_CITIZEN_WHERE,
            ...(handleQuery
              ? [
                  {
                    handle: {
                      contains: handleQuery,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                ]
              : []),
          ],
        },
        select: {
          id: true,
          handle: true,
          birthdayDay: true,
          birthdayMonth: true,
        },
      });

      const now = new Date();

      return citizens
        .flatMap((citizen) => {
          if (citizen.birthdayDay === null || citizen.birthdayMonth === null)
            return [];

          return [
            {
              citizen: { id: citizen.id, handle: citizen.handle },
              ...getNextBirthday(
                citizen.birthdayDay,
                citizen.birthdayMonth,
                now,
              ),
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
    },
  ),
);

export type UpcomingBirthday = Awaited<
  ReturnType<typeof getUpcomingBirthdays>
>[number];
