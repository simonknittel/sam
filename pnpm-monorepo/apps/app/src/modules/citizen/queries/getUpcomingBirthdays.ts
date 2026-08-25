import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getNextBirthday } from "../utils/upcomingBirthdays";

/**
 * Every citizen who filled in their birthday, with the next time it is
 * celebrated. A citizen appears exactly once: only their next birthday is in
 * the list, never the one of the year after.
 *
 * The birthday needs no permission of its own beyond `citizen;read`, the
 * same rule the citizen popover follows.
 */
export const getUpcomingBirthdays = cache(
  withTrace("getUpcomingBirthdays", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("citizen", "read"))) forbidden();

    const citizens = await prisma.entity.findMany({
      where: {
        AND: [{ birthdayDay: { not: null } }, { birthdayMonth: { not: null } }],
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
            ...getNextBirthday(citizen.birthdayDay, citizen.birthdayMonth, now),
          },
        ];
      })
      .toSorted(
        (first, second) =>
          first.daysUntil - second.daysUntil ||
          (first.citizen.handle ?? first.citizen.id).localeCompare(
            second.citizen.handle ?? second.citizen.id,
            "de",
          ),
      );
  }),
);

export type UpcomingBirthday = Awaited<
  ReturnType<typeof getUpcomingBirthdays>
>[number];
