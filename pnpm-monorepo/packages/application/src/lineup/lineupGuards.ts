import type { Prisma } from "@sam-monorepo/database/client";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors.js";
import { EventErrorMessage } from "../events/eventErrors.js";
import {
  requireManageableEvent,
  VISIBLE_EVENT_MANAGE_GUARD_SELECT,
  type ManageableEventOptions,
} from "../events/eventManageGuard.js";
import {
  isAllowedToManagePositions,
  isEventUpdatable,
  isLineupVisible,
} from "../events/eventManageRules.js";
import { canActorSeeEvent } from "../events/eventVisibility.js";
import { LineupErrorMessage } from "./lineupErrors.js";
import { LINEUP_POSITION_SELECT } from "./lineupWrites.js";

/**
 * What the guards of the lineup decide on (the visibility, the freeze, the
 * manage rule and whether the lineup is enabled), and the name for the
 * outputs
 */
export const LINEUP_EVENT_SELECT = {
  ...VISIBLE_EVENT_MANAGE_GUARD_SELECT,
  name: true,
  lineupEnabled: true,
} as const satisfies Prisma.EventSelect;

/**
 * The permissions of the lineup page (see `getEventLineup()`). Each guard of
 * this file requires them, thus a write needs the same permissions as the
 * read of the lineup.
 *
 * @throws ForbiddenError
 */
const requireLineupPermissions = (actor: Actor) => {
  requirePermission(actor, "event", "read");
  requirePermission(actor, "ship", "read");
};

/**
 * The guard of each change of the lineup of an event: the actor has the
 * permissions of the lineup, the event exists, is not deleted and is visible
 * for the actor, it has not ended, and the actor manages its positions.
 *
 * @throws NotFoundError, ConflictError or ForbiddenError
 */
export const requireManageableEventLineup = async (
  context: ApplicationContext,
  actor: Actor,
  eventId: string,
  options: ManageableEventOptions = {},
) => {
  requireLineupPermissions(actor);

  const event = await context.prisma.event.findUnique({
    where: { id: eventId, deletedAt: null },
    select: LINEUP_EVENT_SELECT,
  });
  if (!event) throw new NotFoundError(EventErrorMessage.NotFound);

  requireManageableEvent(
    context,
    actor,
    event,
    isAllowedToManagePositions,
    options,
  );

  return event;
};

/**
 * A position of the lineup of an event that is not deleted and that the
 * actor can see, with its event. A position of an event template does not
 * exist for the use cases: they change only the lineups of events.
 *
 * @throws ForbiddenError or NotFoundError
 */
const findVisibleEventPosition = async (
  context: ApplicationContext,
  actor: Actor,
  positionId: string,
) => {
  requireLineupPermissions(actor);

  const position = await context.prisma.eventPosition.findUnique({
    where: { id: positionId, event: { deletedAt: null } },
    select: {
      ...LINEUP_POSITION_SELECT,
      event: { select: LINEUP_EVENT_SELECT },
    },
  });
  if (!position?.event || !canActorSeeEvent(actor, position.event))
    throw new NotFoundError(LineupErrorMessage.PositionNotFound);

  return { ...position, event: position.event };
};

/**
 * A position of the lineup of an event that the actor manages (see
 * `requireManageableEventLineup()`), with its event
 *
 * @throws NotFoundError, ConflictError or ForbiddenError
 */
export const requireManageableEventPosition = async (
  context: ApplicationContext,
  actor: Actor,
  positionId: string,
) => {
  const { event, ...position } = await findVisibleEventPosition(
    context,
    actor,
    positionId,
  );
  requireManageableEvent(context, actor, event, isAllowedToManagePositions);

  return { position, event };
};

/**
 * A position of an event that has not ended, in a lineup that the actor can
 * see, with the event: the guard of the own applications. The lineup is
 * visible when it is enabled or when the actor manages the positions (see
 * `getEventLineup()`).
 *
 * @throws NotFoundError, ConflictError or ForbiddenError
 */
export const requireApplicableEventPosition = async (
  context: ApplicationContext,
  actor: Actor,
  positionId: string,
) => {
  const position = await findVisibleEventPosition(context, actor, positionId);

  if (!isEventUpdatable(position.event, context.now()))
    throw new ConflictError(EventErrorMessage.EventEnded);

  if (!isLineupVisible(actor, position.event))
    throw new ForbiddenError("The lineup of the event is not enabled");

  return position;
};
