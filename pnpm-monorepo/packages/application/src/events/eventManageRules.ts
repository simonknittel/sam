import type { Citizen, Event } from "@sam-monorepo/database/client";
import { getEventEndTime } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";

export type EventManageInput = Pick<
  Event,
  "discordCreatorId" | "createdById"
> & {
  readonly managers: readonly Pick<Citizen, "id">[];
};

/**
 * The organizers of an event manage it without a permission: the Discord
 * creator, the creator and the managers.
 */
const isEventOrganizer = (actor: Actor, event: EventManageInput) => {
  /**
   * The Discord creator of a Discord event keeps manage rights even when no
   * citizen is attached to their Discord id yet.
   */
  if (
    event.discordCreatorId !== null &&
    event.discordCreatorId === actor.discordUserId
  )
    return true;

  const citizenId = actor.citizen?.id ?? null;
  if (citizenId === null) return false;

  if (event.createdById === citizenId) return true;

  /**
   * Managers are matched by citizen id, not Discord id, so a manager
   * without a Discord id does not silently lose access.
   */
  return event.managers.some((manager) => manager.id === citizenId);
};

export const isAllowedToManageEvent = (actor: Actor, event: EventManageInput) =>
  isEventOrganizer(actor, event) || actor.authorize("event", "manage");

export const isAllowedToManagePositions = (
  actor: Actor,
  event: EventManageInput,
) =>
  isEventOrganizer(actor, event) ||
  actor.authorize("othersEventPosition", "manage");

/**
 * The lineup shows to everybody when it is enabled, and to the managers of
 * the positions always. While the participation of the event is turned off,
 * the lineup shows to nobody.
 */
export const isLineupVisible = (
  actor: Actor,
  event: EventManageInput &
    Pick<Event, "lineupEnabled" | "participationEnabled">,
) =>
  event.participationEnabled &&
  (event.lineupEnabled || isAllowedToManagePositions(actor, event));

/** An event that has not ended yet can change */
export const isEventUpdatable = (
  event: Pick<Event, "startTime" | "endTime">,
  now: Date,
) => getEventEndTime(event) > now;
