import { EventSource } from "@sam-monorepo/database/browser";
import type { Event, Prisma } from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError } from "../errors.js";
import { EventErrorMessage } from "./eventErrors.js";
import { VISIBLE_EVENT_MANAGE_GUARD_SELECT } from "./eventManageGuard.js";
import { canActorSeeEvent } from "./eventVisibility.js";

/**
 * Loads an app event for a participation write. Gives null when the event
 * does not exist, is not an app event, is soft-deleted or is not visible to
 * the actor — deliberately indistinguishable cases.
 */
const findParticipatableAppEvent = async (
  context: ApplicationContext,
  actor: Actor,
  eventId: string,
) => {
  const event = await context.prisma.event.findUnique({
    where: {
      id: eventId,
      source: EventSource.APP,
      deletedAt: null,
    },
    select: {
      ...VISIBLE_EVENT_MANAGE_GUARD_SELECT,
      participationEnabled: true,
    },
  });
  if (!event || !canActorSeeEvent(actor, event)) return null;

  return event;
};

/**
 * The guard of each write of a participation or of the lineup of an event:
 * while a manager turned the participation off, nobody can sign up or be
 * added, and the lineup is hidden. The positions stay for a later switch to
 * true.
 *
 * @throws ConflictError
 */
export const requireParticipationEnabled = (
  event: Pick<Event, "participationEnabled">,
) => {
  if (!event.participationEnabled)
    throw new ConflictError(EventErrorMessage.ParticipationDisabled);
};

/**
 * The check of `requireParticipationEnabled()` again, in the transaction of
 * a write that adds a participant, an application or an assignment. The
 * shared lock on the row of the event waits for a switch to false that
 * changed the row first, and a switch that comes later waits for this
 * transaction. Thus the switch cannot clear the participation before the
 * write adds a row that it then keeps. Call it first in the transaction.
 *
 * PostgreSQL releases the lock at the commit or the rollback.
 *
 * @throws NotFoundError or ConflictError
 */
export const lockParticipationEnabledEvent = async (
  transaction: Prisma.TransactionClient,
  eventId: Event["id"],
) => {
  const [event] = await transaction.$queryRaw<
    Pick<Event, "participationEnabled">[]
  >`SELECT "participationEnabled" FROM "Event" WHERE "id" = ${eventId} FOR SHARE`;
  if (!event) throw new NotFoundError(EventErrorMessage.NotFound);

  requireParticipationEnabled(event);
};

/**
 * Like `findParticipatableAppEvent()`, but throws instead of giving null, and
 * when the participation of the event is turned off
 *
 * @throws NotFoundError or ConflictError
 */
export const requireParticipatableAppEvent = async (
  context: ApplicationContext,
  actor: Actor,
  eventId: string,
) => {
  const event = await findParticipatableAppEvent(context, actor, eventId);
  if (!event) throw new NotFoundError(EventErrorMessage.NotFound);
  requireParticipationEnabled(event);

  return event;
};

/**
 * Participation (sign-up, comment updates, cancellation) stays open until
 * the event's end — deliberately longer than the `isEventUpdatable` freeze
 * used for management writes. App events always have an end time; a
 * missing one closes participation defensively.
 */
export const isParticipationOpen = (
  event: Pick<Event, "endTime">,
  now: Date,
): boolean => event.endTime !== null && event.endTime > now;

/**
 * The app event of an own participation write: visible to the actor, and
 * the participation is still open
 */
export const requireOpenParticipatableAppEvent = async (
  context: ApplicationContext,
  actor: Actor,
  eventId: string,
) => {
  const event = await requireParticipatableAppEvent(context, actor, eventId);
  if (!isParticipationOpen(event, context.now()))
    throw new ConflictError(EventErrorMessage.ParticipationClosed);

  return event;
};
