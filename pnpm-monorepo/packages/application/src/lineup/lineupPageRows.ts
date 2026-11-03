import type { Citizen, Prisma, Ship } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import { loadEffectivePermissionsOfCitizens } from "../auth/effectivePermissionsOfCitizens.js";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError } from "../errors.js";
import {
  isAllowedToManagePositions,
  isLineupVisible,
} from "../events/eventManageRules.js";
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

/**
 * The roles that a position of the event requires. The requirement check of
 * the lineup needs only these roles of a citizen, thus the page gets no
 * other roles.
 */
const findRequiredRoleIdsOfEvent = async (
  context: ApplicationContext,
  eventId: string,
): Promise<Set<string>> => {
  const requiredRoles = await context.prisma.eventPositionRequiredRole.findMany(
    {
      where: { position: { eventId } },
      select: { roleId: true },
      distinct: ["roleId"],
    },
  );

  return new Set(requiredRoles.map(({ roleId }) => roleId));
};

/**
 * The effective roles of the actor (see `Actor.roleIds`) that a position of
 * the event requires, for the requirement check of the lineup. Requires
 * `event;read`. Empty for a user without a citizen.
 */
export const findOwnRequiredRoleIds = async (
  context: ApplicationContext,
  actor: Actor,
  { eventId }: LineupPageRowsInput,
): Promise<string[]> => {
  requirePermission(actor, "event", "read");

  if (!actor.citizen) return [];

  const requiredRoleIds = await findRequiredRoleIdsOfEvent(context, eventId);

  return [...actor.roleIds].filter((roleId) => requiredRoleIds.has(roleId));
};

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
  /**
   * The effective roles of the citizen that the lineup requires. Empty when
   * the actor cannot manage the positions: only the citizen picker of the
   * managers compares them.
   */
  readonly roleIds: string[];
}

/**
 * The required roles of the citizens, by citizen id. Without a required role
 * in the lineup, the query of the roles is not necessary.
 */
const findRequiredRoleIdsOfCitizens = async (
  context: ApplicationContext,
  eventId: string,
  citizenIds: readonly string[],
): Promise<Map<string, string[]>> => {
  const requiredRoleIds = await findRequiredRoleIdsOfEvent(context, eventId);
  if (requiredRoleIds.size <= 0 || citizenIds.length <= 0) return new Map();

  const effectiveRolesByCitizenId = await loadEffectivePermissionsOfCitizens(
    context,
    { id: { in: [...citizenIds] } },
  );

  return new Map(
    Array.from(effectiveRolesByCitizenId, ([citizenId, { roleIds }]) => [
      citizenId,
      [...roleIds].filter((roleId) => requiredRoleIds.has(roleId)),
    ]),
  );
};

/**
 * The citizens of the active participants of an event, with their ships of
 * the required variants and, for a manager of the positions, their required
 * roles. The lineup offers these citizens for its positions,
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

  const roleIdsByCitizenId = isAllowedToManagePositions(actor, event)
    ? await findRequiredRoleIdsOfCitizens(
        context,
        event.id,
        citizens.map((citizen) => citizen.id),
      )
    : new Map<string, string[]>();

  return citizens.map(({ ships, ...citizen }) => ({
    citizen,
    ships,
    roleIds: roleIdsByCitizenId.get(citizen.id) ?? [],
  }));
};
