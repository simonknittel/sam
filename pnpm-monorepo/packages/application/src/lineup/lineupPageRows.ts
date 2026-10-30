import type { Citizen, Prisma, Ship } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError } from "../errors.js";
import { isLineupVisible } from "../events/eventManageRules.js";
import { EVENT_PAGE_RELATIONS_SELECT } from "../events/eventSelects.js";
import { requireVisibleEvent } from "../events/findVisibleEvent.js";
import { buildParticipantCitizenWhere } from "../events/participantCitizenWhere.js";

/**
 * The ships that the requirement check of the lineup compares with the
 * required variants: the ships that are not deleted, of a variant that a
 * position of the event requires. The check of the own ships and the check
 * of the participants use the same rule, thus they cannot disagree.
 */
const buildRequiredVariantShipWhere = (eventId: string) =>
  ({
    deletedAt: null,
    variant: {
      eventPositionRequiredVariants: {
        some: {
          position: {
            eventId,
          },
        },
      },
    },
  }) satisfies Prisma.ShipWhereInput;

interface LineupPageRowsInput {
  readonly eventId: string;
}

type RequiredVariantShip = Pick<Ship, "variantId">;

/**
 * The ships of the actor for the requirement check of the lineup of an
 * event. Requires `ship;read`. Empty for a user without a citizen.
 */
export const findOwnShipsOfRequiredVariants = async (
  context: ApplicationContext,
  actor: Actor,
  { eventId }: LineupPageRowsInput,
): Promise<RequiredVariantShip[]> => {
  requirePermission(actor, "ship", "read");

  if (!actor.citizen) return [];

  return context.prisma.ship.findMany({
    where: {
      ...buildRequiredVariantShipWhere(eventId),
      ownerId: actor.citizen.id,
    },
    select: { variantId: true },
  });
};

/** An active participant of an event, as the lineup offers it */
export interface EventLineupCitizen {
  readonly citizen: Pick<Citizen, "id" | "handle" | "deletedAt">;
  /** The ships of the citizen of the variants that the lineup requires */
  readonly ships: RequiredVariantShip[];
}

/**
 * The citizens of the active participants of an event, with their ships of
 * the required variants. The lineup offers these citizens for its positions,
 * thus a deleted citizen is not one of them. The same checks as the lineup
 * page: `event;read`, the visibility of the event, and a lineup that is
 * enabled or that the actor can manage.
 *
 * @throws NotFoundError or ForbiddenError
 */
export const findEventLineupCitizens = async (
  context: ApplicationContext,
  actor: Actor,
  { eventId }: LineupPageRowsInput,
): Promise<EventLineupCitizen[]> => {
  const event = await requireVisibleEvent(context, actor, eventId, {
    lineupEnabled: true,
    participationEnabled: true,
    participants: EVENT_PAGE_RELATIONS_SELECT.participants,
  });

  if (!isLineupVisible(actor, event))
    throw new ForbiddenError("The lineup of the event is not enabled");

  const citizens = await context.prisma.citizen.findMany({
    where: {
      ...buildParticipantCitizenWhere(event.participants),
      ...ACTIVE_CITIZEN_WHERE,
    },
    select: {
      ...CITIZEN_REFERENCE_SELECT,
      ships: {
        where: buildRequiredVariantShipWhere(event.id),
        select: { variantId: true },
      },
    },
  });

  return citizens.map(({ ships, ...citizen }) => ({ citizen, ships }));
};
