import type { Citizen, Event } from "@sam-monorepo/database/client";
import { getEventEndTime } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";

export type EventManageInput = Pick<
  Event,
  "discordCreatorId" | "createdById"
> & {
  readonly managers: readonly Pick<Citizen, "id">[];
};

/** The organizers of an event manage it without a permission */
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

export type EventApplicationRequirementInput = EventManageInput &
  Pick<Event, "applicationRequired">;

/** An open invitation also signs the actor up without an application */
export const mustApplyForEvent = (
  actor: Actor,
  event: EventApplicationRequirementInput,
) => event.applicationRequired && !isAllowedToManageEvent(actor, event);

export const isAllowedToManagePositions = (
  actor: Actor,
  event: EventManageInput,
) =>
  isEventOrganizer(actor, event) ||
  actor.authorize("othersEventPosition", "manage");

/**
 * A change of a lineup that is not published notifies nobody: the publication
 * tells each participant the own positions
 */
export const isLineupPublished = (
  event: Pick<Event, "lineupEnabled" | "participationEnabled">,
) => event.lineupEnabled && event.participationEnabled;

export const isLineupVisible = (
  actor: Actor,
  event: EventManageInput &
    Pick<Event, "lineupEnabled" | "participationEnabled">,
) =>
  event.participationEnabled &&
  (event.lineupEnabled || isAllowedToManagePositions(actor, event));

export const isEventUpdatable = (
  event: Pick<Event, "startTime" | "endTime">,
  now: Date,
) => getEventEndTime(event) > now;
