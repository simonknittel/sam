import type { Prisma } from "@sam-monorepo/database/client";
import type { PermissionSet } from "@sam-monorepo/domain";
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
import { requireParticipationEnabled } from "../events/participatableAppEvent.js";
import { LineupErrorMessage } from "./lineupErrors.js";
import { LINEUP_POSITION_SELECT } from "./lineupWrites.js";

export const LINEUP_EVENT_SELECT = {
  ...VISIBLE_EVENT_MANAGE_GUARD_SELECT,
  name: true,
  lineupEnabled: true,
  participationEnabled: true,
} as const satisfies Prisma.EventSelect;

/**
 * The permissions of the lineup page (see `getEventLineup()`). Each guard of
 * this file requires them, thus a write needs the same permissions as the
 * read of the lineup. The notifications that link to the lineup page reach
 * only the citizens with these permissions.
 */
export const LINEUP_PERMISSION_SETS = [
  { resource: "event", operation: "read" },
  { resource: "ship", operation: "read" },
] as const satisfies readonly PermissionSet[];

export const requireLineupPermissions = (actor: Actor) => {
  for (const { resource, operation } of LINEUP_PERMISSION_SETS)
    requirePermission(actor, resource, operation);
};

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
  requireParticipationEnabled(event);

  return event;
};

/**
 * A position of an event template does not exist for the use cases: they
 * change only the lineups of events
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
  requireParticipationEnabled(event);

  return { position, event };
};

/** The guard of the own applications */
export const requireApplicableEventPosition = async (
  context: ApplicationContext,
  actor: Actor,
  positionId: string,
) => {
  const position = await findVisibleEventPosition(context, actor, positionId);

  if (!isEventUpdatable(position.event, context.now()))
    throw new ConflictError(EventErrorMessage.EventEnded);
  requireParticipationEnabled(position.event);

  if (!isLineupVisible(actor, position.event))
    throw new ForbiddenError("The lineup of the event is not enabled");

  return position;
};
