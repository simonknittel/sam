import type {
  Entity,
  Event,
  EventParticipant,
  Ship,
  Upload,
} from "@sam-monorepo/database/browser";

/**
 * The narrow shapes `getEventById()` and `getEvents()` return for their
 * relations, declared once because every event surface — the layout, the
 * seven subpages, the list tiles and their client components — states them
 * in its props. The event pages serialize these into the browser, so a full
 * Entity or Upload row here would ship a citizen's Discord id, Teamspeak id
 * and SILC balances with every event.
 */

/** A citizen as the event surfaces render them: a `CitizenLink`, no more */
export type EventCitizenReference = Pick<Entity, "id" | "handle">;

/** The participation columns the event surfaces read */
export type EventParticipantRow = Pick<
  EventParticipant,
  "id" | "citizenId" | "discordUserId" | "comment" | "createdAt"
>;

/** A cover image as `getPublicUploadUrl()` and `next/image` need it */
export type EventCoverImage = Pick<Upload, "id" | "mimeType">;

/**
 * One event participant with the ships the lineup matches against a
 * position's required variants
 */
export interface EventCitizenWithShips {
  readonly citizen: EventCitizenReference;
  readonly ships: Pick<Ship, "id" | "variantId">[];
}

/** An event as the event picker lists it */
export type EventOption = Pick<Event, "id" | "name" | "startTime">;
