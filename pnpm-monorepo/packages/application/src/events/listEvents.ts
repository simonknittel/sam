import { EventSource } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { CursorDirection, ReadMarkerSubject } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";
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
import { OPEN_INVITATION_WHERE } from "./eventInvitationStatus.js";
import {
  toEventSourceType,
  toEventVisibilityType,
  type EventSourceType,
  type EventVisibilityType,
} from "./eventOutput.js";
import { EVENT_PAGE_RELATIONS_SELECT } from "./eventSelects.js";
import { buildVisibleEventsWhere, toEventViewer } from "./eventVisibility.js";
import { findNewEventIds, getOpenEventsWhere } from "./openEvents.js";

export enum EventListStatus {
  Open = "open",
  New = "new",
  /** Events which have started */
  Closed = "closed",
  All = "all",
}

export enum EventParticipationFilter {
  All = "all",
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
      "open: not ended yet, or not started yet for an event without an end. new: open and not read by the user yet. closed: already started. Open and new are sorted by the start ascending, closed and all descending.",
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
  readonly participant_count: number;
  readonly participation_enabled: boolean;
  readonly application_required: boolean;
  readonly is_participating: boolean;
  readonly is_new: boolean;
}

export interface ListEventsOutput {
  readonly events: EventListEntry[];
  readonly next_cursor: string | null;
}

/**
 * Not a row for each participant: the query counts the participants and loads
 * only the rows of the viewer
 */
const eventListSelect = (
  viewerParticipationWhere: Prisma.EventParticipantWhereInput,
  viewerCitizenWhere: ViewerCitizenWhere,
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
    lineupEnabled: true,
    participationEnabled: true,
    applicationRequired: true,
    invitations: {
      where: { ...viewerCitizenWhere, ...OPEN_INVITATION_WHERE },
      take: 1,
      select: {
        message: true,
        createdBy: { select: CITIZEN_REFERENCE_SELECT },
      },
    },
    applications: {
      where: viewerCitizenWhere,
      orderBy: { createdAt: "desc" },
      take: 1,
      select: {
        comment: true,
        approvedAt: true,
        declinedAt: true,
        declineReason: true,
        withdrawnAt: true,
      },
    },
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

type ViewerCitizenWhere =
  { readonly citizenId: string } | { readonly id: { readonly in: string[] } };

/** An empty where would match the rows of all citizens */
const buildViewerCitizenWhere = (actor: Actor): ViewerCitizenWhere => {
  const citizenId = actor.citizen?.id ?? null;

  return citizenId === null ? { id: { in: [] } } : { citizenId };
};

export interface EventCardRows {
  /** Their participations are only the active ones of the actor */
  readonly events: EventListRow[];
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

/** `null` when nothing can be new for the actor */
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

/** One query for the whole list: each event preview needs the flag */
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
  readonly now: Date;
  readonly areAllNew?: boolean;
}

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
          select: eventListSelect(
            viewerParticipationWhere,
            buildViewerCitizenWhere(actor),
          ),
          orderBy: [{ startTime: orderDirection }, { id: orderDirection }],
          ...cursorArguments,
        }),
      async (id) => (await context.prisma.event.count({ where: { id } })) > 0,
    );

    return {
      ...(await toEventCardRows(context, actor, page.items, {
        now,
        areAllNew: input.status === EventListStatus.New,
      })),
      nextCursor: page.nextCursor,
      prevCursor: page.previousCursor,
    };
  });

/**
 * The caller limits the number of the events with the fragment (for example a
 * date range)
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
      select: eventListSelect(
        buildViewerParticipationWhere(actor),
        buildViewerCitizenWhere(actor),
      ),
      orderBy: [{ startTime: "asc" }, { id: "asc" }],
    });

    return toEventCardRows(context, actor, events, { now: context.now() });
  });

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
      application_required: event.applicationRequired,
      is_participating: event.participants.length > 0,
      is_new: page.newEventIds.has(event.id),
    })),
    next_cursor: page.nextCursor,
  };
};
