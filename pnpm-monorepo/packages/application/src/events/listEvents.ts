import { EventSource } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { CursorDirection, ReadMarkerSubject } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  cursorSchema,
  pageLimitSchema,
  paginateByDatabaseCursor,
  type PageOptions,
} from "../pagination.js";
import {
  buildUnreadWhere,
  type UnreadWhere,
} from "../readMarkers/unreadWhere.js";
import { withSpan } from "../withSpan.js";
import {
  toEventSourceType,
  toEventVisibilityType,
  type EventSourceType,
  type EventVisibilityType,
} from "./eventOutput.js";
import { EVENT_PAGE_RELATIONS_SELECT } from "./eventSelects.js";
import { buildVisibleEventsWhere, toEventViewer } from "./eventVisibility.js";
import { findNewEventIds, getOpenEventsWhere } from "./openEvents.js";

/** The status filter of the events list */
export enum EventListStatus {
  /** Events which have not ended yet */
  Open = "open",
  /** The open events which are new for the viewer (see the read markers) */
  New = "new",
  /** Events which have started */
  Closed = "closed",
  All = "all",
}

export enum EventParticipationFilter {
  All = "all",
  /** Only the events with an active participation of the actor */
  Me = "me",
}

export enum EventTypeFilter {
  All = "all",
  App = "app",
  Discord = "discord",
}

export const listEventsInputSchema = z.object({
  status: z
    .enum(EventListStatus)
    .default(EventListStatus.Open)
    .describe(
      "open: not ended yet. new: open and not read by the user yet. closed: already started. Open and new are sorted by the start ascending, closed and all descending.",
    ),
  participating: z
    .enum(EventParticipationFilter)
    .default(EventParticipationFilter.All)
    .describe("me: only the events with an active sign-up of the user."),
  type: z
    .enum(EventTypeFilter)
    .default(EventTypeFilter.All)
    .describe("app or discord: only the events of this source."),
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
});

export type ListEventsInput = z.infer<typeof listEventsInputSchema>;

export interface EventListEntry {
  readonly id: string;
  readonly name: string;
  readonly start_time: string;
  /** Null when the event has no explicit end */
  readonly end_time: string | null;
  readonly location: string | null;
  readonly source: EventSourceType;
  readonly visibility: EventVisibilityType;
  /** The active participations */
  readonly participant_count: number;
  /** False when a manager turned off the participation (see `get_event`) */
  readonly participation_enabled: boolean;
  readonly is_participating: boolean;
  /** Open and unread for the actor (see the read markers) */
  readonly is_new: boolean;
}

export interface ListEventsOutput {
  readonly events: EventListEntry[];
  /** Null on the last page */
  readonly next_cursor: string | null;
}

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
    location: true,
    visibility: true,
    source: true,
    discordId: true,
    discordGuildId: true,
    discordImage: true,
    // For the lineup and briefing checks
    lineupEnabled: true,
    // Also hides the sign-up and the participant count of the event card
    participationEnabled: true,
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

export type EventListRow = Prisma.EventGetPayload<{
  select: ReturnType<typeof eventListSelect>;
}>;

/** The rows of the event cards of a list */
export interface EventCardRows {
  /** The participations of each event are the active ones of the actor */
  readonly events: EventListRow[];
  /** The listed events with a cancelled participation of the actor */
  readonly cancelledParticipationEventIds: string[];
  readonly newEventIds: ReadonlySet<string>;
}

export interface EventListPage extends EventCardRows {
  readonly nextCursor: string | null;
  readonly prevCursor: string | null;
}

const EMPTY_EVENT_LIST_PAGE: EventListPage = {
  events: [],
  cancelledParticipationEventIds: [],
  newEventIds: new Set(),
  nextCursor: null,
  prevCursor: null,
};

/**
 * The where fragment of the status filter. `null` when no event can match,
 * because nothing can be new for the actor.
 */
const getStatusWhere = (
  status: EventListStatus,
  now: Date,
  unreadWhere: UnreadWhere | null,
): Prisma.EventWhereInput | null => {
  switch (status) {
    case EventListStatus.Open:
      return getOpenEventsWhere(now);

    case EventListStatus.New:
      if (!unreadWhere) return null;

      return { AND: [getOpenEventsWhere(now), unreadWhere] };

    case EventListStatus.Closed:
      return { startTime: { lt: now } };

    case EventListStatus.All:
      return {};

    default:
      throw new Error(`Unknown event list status: ${status satisfies never}`);
  }
};

const getSourceWhere = (type: EventTypeFilter): Prisma.EventWhereInput => {
  switch (type) {
    case EventTypeFilter.All:
      return {};

    case EventTypeFilter.App:
      return { source: EventSource.APP };

    case EventTypeFilter.Discord:
      return { source: EventSource.DISCORD };

    default:
      throw new Error(`Unknown event type filter: ${type satisfies never}`);
  }
};

/**
 * Of the listed events, the ones the actor has cancelled their
 * participation for. Batched into a single query on purpose: every event
 * preview needs the flag, and asking per event would turn the lists into
 * N+1 queries.
 */
const getCancelledParticipationEventIds = async (
  context: ApplicationContext,
  eventIds: string[],
  citizenId: string | null,
): Promise<string[]> => {
  if (citizenId === null || eventIds.length <= 0) return [];

  const rows = await context.prisma.eventParticipant.findMany({
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

/** The active participations of the actor, by Discord account or citizen */
const buildViewerParticipationWhere = (
  actor: Actor,
): Prisma.EventParticipantWhereInput => {
  const { discordUserId } = actor;
  const citizenId = actor.citizen?.id ?? null;

  /**
   * Without a Discord id, `{ discordUserId: null }` would match every app
   * sign-up
   */
  return {
    cancelledAt: null,
    OR: [
      ...(discordUserId ? [{ discordUserId }] : []),
      ...(citizenId ? [{ citizenId }] : []),
    ],
  };
};

interface EventCardRowsOptions {
  /** The moment of the read */
  readonly now: Date;
  /**
   * True for a list that holds only new events: each event is new without a
   * read of the read markers
   */
  readonly areAllNew?: boolean;
}

/**
 * The listed events with the flags of their cards: the events with a
 * cancelled participation of the actor and the events that are new for the
 * actor
 */
const toEventCardRows = async (
  context: ApplicationContext,
  actor: Actor,
  events: EventListRow[],
  { now, areAllNew = false }: EventCardRowsOptions,
): Promise<EventCardRows> => {
  const eventIds = events.map((event) => event.id);
  const unreadWhere = buildUnreadWhere(actor, ReadMarkerSubject.Event);

  const getNewEventIds = async () => {
    if (areAllNew) return eventIds;
    if (!unreadWhere) return [];

    return findNewEventIds(context.prisma, eventIds, unreadWhere, now);
  };

  const [cancelledParticipationEventIds, newEventIds] = await Promise.all([
    getCancelledParticipationEventIds(
      context,
      eventIds,
      actor.citizen?.id ?? null,
    ),
    getNewEventIds(),
  ]);

  return {
    events,
    cancelledParticipationEventIds,
    newEventIds: new Set(newEventIds),
  };
};

/**
 * One page of the events that the actor can see, with the rows that the
 * event cards of the app render. The app pages in both directions, the
 * `listEvents` use case only forward.
 *
 * @throws ValidationError for a cursor of no event, unless the options give
 * `UnknownCursorBehavior.FirstPage`
 */
export const findEventListPage = (
  context: ApplicationContext,
  actor: Actor,
  input: ListEventsInput,
  { direction = CursorDirection.Next, unknownCursor }: PageOptions = {},
): Promise<EventListPage> =>
  withSpan(context, "findEventListPage", async () => {
    requirePermission(actor, "event", "read");

    const now = context.now();
    const unreadWhere = buildUnreadWhere(actor, ReadMarkerSubject.Event);

    const statusWhere = getStatusWhere(input.status, now, unreadWhere);
    if (!statusWhere) return EMPTY_EVENT_LIST_PAGE;

    const viewerParticipationWhere = buildViewerParticipationWhere(actor);

    const orderDirection: Prisma.SortOrder =
      input.status === EventListStatus.Open ||
      input.status === EventListStatus.New
        ? "asc"
        : "desc";

    const page = await paginateByDatabaseCursor(
      {
        cursor: input.cursor,
        pageSize: input.limit,
        direction,
        unknownCursor,
      },
      (cursorArguments) =>
        context.prisma.event.findMany({
          where: {
            AND: [
              statusWhere,
              getSourceWhere(input.type),
              input.participating === EventParticipationFilter.Me
                ? { participants: { some: viewerParticipationWhere } }
                : {},
              buildVisibleEventsWhere(toEventViewer(actor)),
            ],
          },
          select: eventListSelect(viewerParticipationWhere),
          // Events with the same start keep one order on all pages
          orderBy: [{ startTime: orderDirection }, { id: orderDirection }],
          ...cursorArguments,
        }),
      async (id) => (await context.prisma.event.count({ where: { id } })) > 0,
    );

    return {
      ...(await toEventCardRows(context, actor, page.items, {
        now,
        // The "new" status lists only new events
        areAllNew: input.status === EventListStatus.New,
      })),
      nextCursor: page.nextCursor,
      prevCursor: page.previousCursor,
    };
  });

/**
 * All events of the where fragment that the actor can see, with the rows
 * that the event cards of the app render, sorted by the start. For the lists
 * outside of the events page, for example the calendar. The caller limits
 * the number of the events with the fragment (for example a date range).
 *
 * @throws ForbiddenError without `event;read`
 */
export const findEventCardRows = (
  context: ApplicationContext,
  actor: Actor,
  eventWhere: Prisma.EventWhereInput,
): Promise<EventCardRows> =>
  withSpan(context, "findEventCardRows", async () => {
    requirePermission(actor, "event", "read");

    const events = await context.prisma.event.findMany({
      where: {
        AND: [eventWhere, buildVisibleEventsWhere(toEventViewer(actor))],
      },
      select: eventListSelect(buildViewerParticipationWhere(actor)),
      orderBy: [{ startTime: "asc" }, { id: "asc" }],
    });

    return toEventCardRows(context, actor, events, { now: context.now() });
  });

/**
 * The events that the actor can see, filtered like the events page of the
 * app, in pages. Open and new events are sorted by the start ascending, the
 * others descending.
 */
export const listEvents = async (
  context: ApplicationContext,
  actor: Actor,
  input: ListEventsInput,
): Promise<ListEventsOutput> => {
  const page = await findEventListPage(context, actor, input);

  return {
    events: page.events.map((event) => ({
      id: event.id,
      name: event.name,
      start_time: event.startTime.toISOString(),
      end_time: event.endTime?.toISOString() ?? null,
      location: event.location,
      source: toEventSourceType(event.source),
      visibility: toEventVisibilityType(event.visibility),
      participant_count: event._count.participants,
      participation_enabled: event.participationEnabled,
      is_participating: event.participants.length > 0,
      is_new: page.newEventIds.has(event.id),
    })),
    next_cursor: page.nextCursor,
  };
};
