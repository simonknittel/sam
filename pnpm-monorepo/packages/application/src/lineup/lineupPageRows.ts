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
import { isRoleVisible } from "../roles/roleVisibility.js";

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
 * The requirement check of the lineup needs only these roles of a citizen,
 * thus the page gets no other roles
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

export interface EventLineupCitizen {
  readonly citizen: Pick<Citizen, "id" | "handle" | "deletedAt">;
  readonly ships: RequiredVariantShip[];
  /**
   * The effective roles of the citizen that the lineup requires and that the
   * actor can see: the app shows the roles of a citizen only with
   * `otherRole;read` for each role. Empty when the actor cannot manage the
   * positions: only the citizen picker of the managers compares them.
   */
  readonly roleIds: string[];
}

/**
 * A citizen with a required role that the actor cannot see does not meet the
 * requirement for the actor. Without such a role in the lineup, the query of
 * the roles is not necessary.
 */
const findVisibleRequiredRoleIdsOfCitizens = async (
  context: ApplicationContext,
  actor: Actor,
  eventId: string,
  citizenIds: readonly string[],
): Promise<Map<string, string[]>> => {
  const requiredRoleIds = new Set(
    [...(await findRequiredRoleIdsOfEvent(context, eventId))].filter((roleId) =>
      isRoleVisible(actor, roleId),
    ),
  );
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
 * The lineup offers these citizens for its positions, thus a deleted citizen
 * is not one of them
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
    ? await findVisibleRequiredRoleIdsOfCitizens(
        context,
        actor,
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
