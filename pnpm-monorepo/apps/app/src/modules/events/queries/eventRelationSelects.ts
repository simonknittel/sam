import type { Prisma, Ship } from "@sam-monorepo/database/client";

/*
 * The relation shapes the event detail query and the event list query share,
 * with the prop types every event surface states derived from them — the
 * layout, the seven subpages, the list tiles and their client components all
 * declare these. Deriving rather than restating them keeps a narrowed query
 * and the props it feeds from drifting apart.
 *
 * Event pages serialize these into the browser, so a full Entity or Upload
 * row here would ship a citizen's Discord id, Teamspeak id and SILC balances
 * with every event.
 */

/** A citizen as the event surfaces render them: a `CitizenLink`, no more */
const EVENT_CITIZEN_SELECT = {
  id: true,
  handle: true,
} as const satisfies Prisma.EntitySelect;

/** A cover image as `getPublicUploadUrl()` and `next/image` need it */
const EVENT_COVER_IMAGE_SELECT = {
  id: true,
  mimeType: true,
} as const satisfies Prisma.UploadSelect;

/** The participation columns the event surfaces read */
const EVENT_PARTICIPANT_SELECT = {
  id: true,
  citizenId: true,
  discordUserId: true,
  comment: true,
  createdAt: true,
} as const satisfies Prisma.EventParticipantSelect;

/**
 * Spread into every query that loads an event for a page: the active
 * participants, the managers and the cover image.
 */
export const EVENT_PAGE_RELATIONS_SELECT = {
  participants: {
    where: { cancelledAt: null },
    select: EVENT_PARTICIPANT_SELECT,
  },
  managers: { select: EVENT_CITIZEN_SELECT },
  coverImage: { select: EVENT_COVER_IMAGE_SELECT },
} as const satisfies Prisma.EventSelect;

/**
 * The freeze window and the manage tier of an event, as
 * `isEventUpdatable()` and `isAllowedToManageEvent()` read them. Both
 * position application actions guard on the event behind the position.
 */
export const EVENT_FREEZE_WINDOW_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
} as const satisfies Prisma.EventSelect;

export type EventCitizenReference = Prisma.EntityGetPayload<{
  select: typeof EVENT_CITIZEN_SELECT;
}>;

export type EventCoverImage = Prisma.UploadGetPayload<{
  select: typeof EVENT_COVER_IMAGE_SELECT;
}>;

export type EventParticipantRow = Prisma.EventParticipantGetPayload<{
  select: typeof EVENT_PARTICIPANT_SELECT;
}>;

/**
 * One event participant with the ships the lineup matches against a
 * position's required variants
 */
export interface EventCitizenWithShips {
  readonly citizen: EventCitizenReference;
  readonly ships: Pick<Ship, "id" | "variantId">[];
}
