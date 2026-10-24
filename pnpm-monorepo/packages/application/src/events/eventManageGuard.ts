import type { Prisma } from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors.js";
import { EventErrorMessage } from "./eventErrors.js";
import { isEventUpdatable } from "./eventManageRules.js";
import { canActorSeeEvent } from "./eventVisibility.js";

/**
 * Exactly what the event management guard decides on: the freeze window
 * (`isEventUpdatable`) and the manage tier (`isAllowedToManageEvent` /
 * `isAllowedToManagePositions`).
 *
 * Writes that need more than the guard spread this and add their own fields,
 * so no guard call site has to fetch full manager Citizen rows again.
 */
export const EVENT_MANAGE_GUARD_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  discordCreatorId: true,
  createdById: true,
  managers: { select: { id: true } },
} as const satisfies Prisma.EventSelect;

/**
 * The guard fields plus the fields of `canActorSeeEvent()`. A write checks
 * the visibility too, thus a rule without the visibility (for example
 * `othersEventPosition;manage`) cannot reveal or change a restricted event.
 */
export const VISIBLE_EVENT_MANAGE_GUARD_SELECT = {
  ...EVENT_MANAGE_GUARD_SELECT,
  visibility: true,
  deletedAt: true,
  visibilityRoles: { select: { roleId: true } },
} as const satisfies Prisma.EventSelect;

type ManageGuardEvent = Prisma.EventGetPayload<{
  select: typeof VISIBLE_EVENT_MANAGE_GUARD_SELECT;
}>;

export interface ManageableEventOptions {
  /**
   * Skips the check of the end of the event. Only for an event that the
   * caller reads from, for example the source of a copy.
   */
  readonly ignoreFreeze?: boolean;
}

/**
 * Throws when the actor cannot read the event (`event;read` and the
 * visibility; it does not exist for the actor then), when the event ended
 * (nothing of it can change then) or when the rule does not let the actor
 * manage it
 *
 * @throws NotFoundError, ConflictError or ForbiddenError
 */
export const requireManageableEvent = (
  context: ApplicationContext,
  actor: Actor,
  event: ManageGuardEvent,
  isAllowed: (actor: Actor, event: ManageGuardEvent) => boolean,
  { ignoreFreeze = false }: ManageableEventOptions = {},
) => {
  // `canActorSeeEvent()` leaves `event;read` to its callers
  if (!actor.authorize("event", "read") || !canActorSeeEvent(actor, event))
    throw new NotFoundError(EventErrorMessage.NotFound);

  if (!ignoreFreeze && !isEventUpdatable(event, context.now()))
    throw new ConflictError(EventErrorMessage.EventEnded);

  if (!isAllowed(actor, event))
    throw new ForbiddenError("The user cannot manage the event");
};
