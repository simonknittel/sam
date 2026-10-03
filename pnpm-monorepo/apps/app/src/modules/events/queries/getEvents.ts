import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { getVisibleEventsWhere } from "@/modules/events/utils/eventVisibility";
import { getNewIds } from "@/modules/read-markers/queries/getNewIds";
import { getUnreadWhere } from "@/modules/read-markers/queries/getUnreadWhere";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { EventSource, type Prisma } from "@sam-monorepo/database/client";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { EventListStatus } from "../utils/EventListStatus";
import { EVENT_PAGE_RELATIONS_SELECT } from "./eventRelationSelects";
import { getOpenEventsWhere } from "./getOpenEventsWhere";

const EVENTS_PAGE_SIZE = 10;

/**
 * An event card shows how many citizens take part and whether the viewer is
 * one of them. Thus the query counts the participants and loads only the
 * participation rows of the viewer, not a row for each participant.
 */
const eventListSelect = (
  viewerParticipationWhere: Prisma.EventParticipantWhereInput,
) =>
  ({
    id: true,
    name: true,
    startTime: true,
    endTime: true,
    source: true,
    discordId: true,
    discordGuildId: true,
    discordImage: true,
    // For the lineup and briefing checks
    lineupEnabled: true,
    discordCreatorId: true,
    createdById: true,
    managers: EVENT_PAGE_RELATIONS_SELECT.managers,
    coverImage: EVENT_PAGE_RELATIONS_SELECT.coverImage,
    participants: {
      where: viewerParticipationWhere,
      select: EVENT_PAGE_RELATIONS_SELECT.participants.select,
    },
    _count: {
      select: {
        participants: {
          where: EVENT_PAGE_RELATIONS_SELECT.participants.where,
        },
      },
    },
  }) satisfies Prisma.EventSelect;

export type EventListItem = Prisma.EventGetPayload<{
  select: ReturnType<typeof eventListSelect>;
}>;

/**
 * How many open events there are in total — for the dashboard tile, which
 * only lists the next few of them.
 */
export const getOpenEventCount = cache(
  withTrace("getOpenEventCount", async (): Promise<number> => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("event", "read"))) forbidden();

    return prisma.event.count({
      where: {
        AND: [getOpenEventsWhere(new Date()), await getVisibleEventsWhere()],
      },
    });
  }),
);

/**
 * Of the listed events, the ones the viewer has cancelled their
 * participation for. Batched into a single query on purpose: every event
 * preview needs the flag, and asking per event would turn the dashboard
 * tile and the events list into N+1 queries.
 */
const getCancelledParticipationEventIds = async (
  eventIds: string[],
  citizenId: string | null,
): Promise<string[]> => {
  if (citizenId === null || eventIds.length <= 0) return [];

  const rows = await prisma.eventParticipant.findMany({
    where: {
      eventId: { in: eventIds },
      citizenId,
      cancelledAt: { not: null },
    },
    select: { eventId: true },
    distinct: ["eventId"],
  });

  return rows.map((row) => row.eventId);
};

/**
 * The where fragment of the status filter. `null` when no event can match,
 * because nothing can be new for the viewer.
 */
const getStatusWhere = async (
  status: EventListStatus,
  now: Date,
): Promise<Prisma.EventWhereInput | null> => {
  switch (status) {
    case EventListStatus.Open:
      return getOpenEventsWhere(now);

    case EventListStatus.New: {
      const unreadWhere = await getUnreadWhere(ReadMarkerSubject.Event);
      if (!unreadWhere) return null;

      return { AND: [getOpenEventsWhere(now), unreadWhere] };
    }

    case EventListStatus.Closed:
      return { startTime: { lt: now } };

    case EventListStatus.All:
      return {};

    default:
      throw new Error(`Unknown event list status: ${status satisfies never}`);
  }
};

export const getEvents = cache(
  withTrace(
    "getEvents",
    async (
      status: EventListStatus = EventListStatus.Open,
      participating: "me" | "all" = "all",
      type: "app" | "discord" | "all" = "all",
      cursor?: string | null,
      direction: "next" | "prev" = "next",
    ) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("event", "read"))) forbidden();

      const now = new Date();

      const where = await getStatusWhere(status, now);
      if (!where)
        return {
          events: [],
          cancelledParticipationEventIds: [],
          newEventIds: new Set<string>(),
          nextCursor: null,
          prevCursor: null,
        };

      if (type === "app") {
        where.source = EventSource.APP;
      } else if (type === "discord") {
        where.source = EventSource.DISCORD;
      }

      const citizenId = authentication.session.entity?.id;
      const discordUserId = authentication.session.discordId;
      /**
       * Without a Discord id, `{ discordUserId: null }` would match every app
       * sign-up
       */
      const viewerParticipationWhere: Prisma.EventParticipantWhereInput = {
        cancelledAt: null,
        OR: [
          ...(discordUserId ? [{ discordUserId }] : []),
          ...(citizenId ? [{ citizenId }] : []),
        ],
      };

      if (participating === "me") {
        where.participants = {
          some: viewerParticipationWhere,
        };
      }

      const orderDirection: "asc" | "desc" =
        status === EventListStatus.Open || status === EventListStatus.New
          ? "asc"
          : "desc";
      const orderBy: Prisma.EventOrderByWithRelationInput = {
        startTime: orderDirection,
      };

      // Fetch one extra to detect if there are more pages
      const take =
        direction === "prev" ? -(EVENTS_PAGE_SIZE + 1) : EVENTS_PAGE_SIZE + 1;

      const rows = await prisma.event.findMany({
        where: {
          AND: [where, await getVisibleEventsWhere()],
        },
        select: eventListSelect(viewerParticipationWhere),
        orderBy,
        ...(cursor
          ? {
              cursor: {
                id: cursor,
              },
              skip: 1,
            }
          : {}),
        take,
      });

      const hasMore = rows.length > EVENTS_PAGE_SIZE;

      let events;
      if (hasMore) {
        if (direction === "prev") {
          // Extra item is at the beginning
          events = rows.slice(1);
        } else {
          // Extra item is at the end
          events = rows.slice(0, EVENTS_PAGE_SIZE);
        }
      } else {
        events = rows;
      }

      // Next page exists if we fetched forward and got extra, or we came from
      // a backward navigation (meaning there's a page ahead we already visited)
      const hasNextPage = direction === "next" ? hasMore : !!cursor;
      const hasPrevPage = direction === "prev" ? hasMore : !!cursor;

      const eventIds = events.map((event) => event.id);
      const [cancelledParticipationEventIds, newEventIds] = await Promise.all([
        getCancelledParticipationEventIds(eventIds, citizenId ?? null),
        status === EventListStatus.New
          ? new Set(eventIds)
          : getNewIds(ReadMarkerSubject.Event, eventIds),
      ]);

      return {
        events,
        cancelledParticipationEventIds,
        newEventIds,
        nextCursor: hasNextPage && events.length > 0 ? events.at(-1)!.id : null,
        prevCursor: hasPrevPage && events.length > 0 ? events[0].id : null,
      };
    },
  ),
);
