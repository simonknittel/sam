import type { Prisma } from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors.js";
import { EventErrorMessage } from "./eventErrors.js";
import { isEventUpdatable } from "./eventManageRules.js";
import { canActorSeeEvent } from "./eventVisibility.js";

/**
 * For the freeze window (`isEventUpdatable`) and the manage tier
 * (`isAllowedToManageEvent` / `isAllowedToManagePositions`), without full
 * Citizen rows of the managers
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
 * A write checks the visibility too, thus a rule without the visibility (for
 * example `othersEventPosition;manage`) cannot reveal or change a restricted
 * event
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
   * Only for an event that the caller reads from, for example the source of a
   * copy
   */
  readonly ignoreFreeze?: boolean;
}

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
