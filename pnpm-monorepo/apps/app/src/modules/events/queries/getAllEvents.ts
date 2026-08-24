import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { getVisibleEventsWhere } from "@/modules/events/utils/eventVisibility";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Prisma } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";
import { cache } from "react";

/** What the event picker searches and submits */
const EVENT_OPTION_SELECT = {
  id: true,
  name: true,
  startTime: true,
} as const satisfies Prisma.EventSelect;

/** An event as the event picker lists it */
export type EventOption = Prisma.EventGetPayload<{
  select: typeof EVENT_OPTION_SELECT;
}>;

export const getAllEvents = cache(
  withTrace("getAllEvents", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("event", "read"))) forbidden();

    return prisma.event.findMany({
      where: await getVisibleEventsWhere(),
      orderBy: {
        name: "asc",
      },
      select: EVENT_OPTION_SELECT,
    });
  }),
);
