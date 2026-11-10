import type { Prisma } from "@sam-monorepo/database/client";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { EventErrorMessage } from "./eventErrors.js";
import { VISIBLE_EVENT_MANAGE_GUARD_SELECT } from "./eventManageGuard.js";
import { EVENT_DETAILS_SELECT, type EventDetails } from "./eventSelects.js";
import { canActorSeeEvent } from "./eventVisibility.js";

/**
 * One event that the actor can see, with everything that its pages share.
 * An event that the actor cannot see is indistinguishable from a missing
 * one: both throw a `NotFoundError`.
 */
export const findVisibleEvent = async (
  context: ApplicationContext,
  actor: Actor,
  eventId: string,
): Promise<EventDetails> => {
  requirePermission(actor, "event", "read");

  const event = await context.prisma.event.findUnique({
    where: { id: eventId },
    select: EVENT_DETAILS_SELECT,
  });

  if (!event || !canActorSeeEvent(actor, event))
    throw new NotFoundError(EventErrorMessage.NotFound);

  return event;
};

type VisibleEventGuardFields = Prisma.EventGetPayload<{
  select: typeof VISIBLE_EVENT_MANAGE_GUARD_SELECT;
}>;

/**
 * The event with the fields of the select of the caller and the fields of
 * the visibility and manage rules. The select of the caller cannot change
 * the fields of the rules.
 */
type VisibleEvent<Select extends Prisma.EventSelect> = Omit<
  Prisma.EventGetPayload<{ select: Select }>,
  keyof VisibleEventGuardFields
> &
  VisibleEventGuardFields;

/**
 * The guard of the row helpers of the event pages: `event;read`, and an
 * event that the actor can see. The pages check the same before, thus the
 * guard only keeps a different caller from reading a restricted event.
 *
 * @throws ForbiddenError without `event;read`, NotFoundError when the actor
 * cannot see the event
 */
export const requireVisibleEvent = async <
  const Select extends Prisma.EventSelect = Record<never, never>,
>(
  context: ApplicationContext,
  actor: Actor,
  eventId: string,
  select?: Select,
): Promise<VisibleEvent<Select>> => {
  requirePermission(actor, "event", "read");

  /**
   * Prisma cannot resolve the payload of a generic select, thus the type of
   * the row comes from `VisibleEvent`. The guard fields come last, thus they
   * always have the shape of the rules.
   */
  const event = (await context.prisma.event.findUnique({
    where: { id: eventId },
    select: { ...select, ...VISIBLE_EVENT_MANAGE_GUARD_SELECT },
  })) as VisibleEvent<Select> | null;

  if (!event || !canActorSeeEvent(actor, event))
    throw new NotFoundError(EventErrorMessage.NotFound);

  return event;
};
