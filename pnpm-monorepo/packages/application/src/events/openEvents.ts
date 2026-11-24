import type { Prisma } from "@sam-monorepo/database/client";
import type { ApplicationContext } from "../context.js";
import type { UnreadWhere } from "../readMarkers/unreadWhere.js";

/**
 * Events that have not ended at `now` — the filter behind the "open" status.
 * An event without an end leaves the filter at its start, not at
 * `getEventEndTime()`.
 */
export const getOpenEventsWhere = (now: Date): Prisma.EventWhereInput => ({
  OR: [{ startTime: { gte: now } }, { endTime: { gte: now } }],
});

/**
 * Of the given events, the ones which are new: open and unread (see
 * `buildUnreadWhere()`). The visibility is not checked again: the ids come
 * from queries which already applied it.
 */
export const findNewEventIds = async (
  prisma: ApplicationContext["prisma"],
  eventIds: readonly string[],
  unreadWhere: UnreadWhere,
  now: Date,
): Promise<string[]> => {
  if (eventIds.length <= 0) return [];

  const events = await prisma.event.findMany({
    where: {
      AND: [
        { id: { in: [...eventIds] } },
        getOpenEventsWhere(now),
        unreadWhere,
      ],
    },
    select: { id: true },
  });

  return events.map((event) => event.id);
};
