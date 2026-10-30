import { VariantStatus } from "@sam-monorepo/database/browser";
import type { Prisma, RoleAssignment } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import {
  CITIZEN_REFERENCE_SELECT,
  type CitizenReferenceRow,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { SHIP_VARIANT_SELECT } from "../fleet/shipVariant.js";
import { EVENT_PAGE_RELATIONS_SELECT } from "./eventSelects.js";
import { buildVisibleEventsWhere, toEventViewer } from "./eventVisibility.js";
import { requireVisibleEvent } from "./findVisibleEvent.js";
import { buildParticipantCitizenWhere } from "./participantCitizenWhere.js";

/** An event as the event picker lists, searches and submits it */
export interface EventOption {
  readonly id: string;
  readonly name: string;
  readonly startTime: Date;
}

/**
 * All events that the actor can see, by name, for the event picker
 *
 * @throws ForbiddenError without `event;read`
 */
export const findEventOptions = (
  context: ApplicationContext,
  actor: Actor,
): Promise<EventOption[]> => {
  requirePermission(actor, "event", "read");

  return context.prisma.event.findMany({
    where: buildVisibleEventsWhere(toEventViewer(actor)),
    orderBy: { name: "asc" },
    select: { id: true, name: true, startTime: true },
  });
};

/** The active participations of an event page */
const ACTIVE_PARTICIPANTS_SELECT = {
  participants: EVENT_PAGE_RELATIONS_SELECT.participants,
} as const satisfies Prisma.EventSelect;

export type EventParticipantRow = Prisma.EventParticipantGetPayload<{
  select: (typeof EVENT_PAGE_RELATIONS_SELECT)["participants"]["select"];
}>;

/** A participating citizen as the participants page and its tiles show it */
export interface ResolvedEventParticipantCitizen extends CitizenReferenceRow {
  readonly discordId: string | null;
  readonly roleAssignments: Pick<RoleAssignment, "roleId" | "currentLevel">[];
}

export interface ResolvedEventParticipant {
  /** The active participation of the citizen */
  readonly participant: EventParticipantRow | undefined;
  readonly citizen: ResolvedEventParticipantCitizen;
}

/**
 * Resolves the citizens behind the active participations of an event that
 * the actor can see, see `buildParticipantCitizenWhere()`. A sign-up of a
 * deleted citizen stays in the list.
 *
 * @throws ForbiddenError without `event;read`, NotFoundError when the actor
 * cannot see the event
 */
export const findResolvedEventParticipants = async (
  context: ApplicationContext,
  actor: Actor,
  { eventId }: { readonly eventId: string },
): Promise<ResolvedEventParticipant[]> => {
  const { participants } = await requireVisibleEvent(
    context,
    actor,
    eventId,
    ACTIVE_PARTICIPANTS_SELECT,
  );

  const citizens = await context.prisma.citizen.findMany({
    where: buildParticipantCitizenWhere(participants),
    select: {
      ...CITIZEN_REFERENCE_SELECT,
      discordId: true,
      roleAssignments: { select: { roleId: true, currentLevel: true } },
    },
  });

  return citizens.map((citizen) => ({
    participant: participants.find(
      (participant) =>
        participant.citizenId === citizen.id ||
        (participant.citizenId === null &&
          participant.discordUserId !== null &&
          participant.discordUserId === citizen.discordId),
    ),
    citizen,
  }));
};

export type EventFleetVariant = Prisma.VariantGetPayload<{
  select: typeof SHIP_VARIANT_SELECT;
}>;

export interface EventFleetEntry {
  readonly variant: EventFleetVariant;
  readonly count: number;
}

/**
 * The flight-ready ships of the participants of an event that the actor can
 * see, counted per variant
 *
 * @throws ForbiddenError without `event;read`, NotFoundError when the actor
 * cannot see the event
 */
export const findEventFleet = async (
  context: ApplicationContext,
  actor: Actor,
  { eventId }: { readonly eventId: string },
): Promise<EventFleetEntry[]> => {
  const { participants } = await requireVisibleEvent(
    context,
    actor,
    eventId,
    ACTIVE_PARTICIPANTS_SELECT,
  );

  const ships = await context.prisma.ship.findMany({
    where: {
      deletedAt: null,
      /** A fleet count is a statistic, thus deleted citizens do not count */
      owner: {
        AND: [buildParticipantCitizenWhere(participants), ACTIVE_CITIZEN_WHERE],
      },
      variant: {
        status: VariantStatus.FLIGHT_READY,
      },
    },
    select: {
      variant: {
        select: SHIP_VARIANT_SELECT,
      },
    },
  });

  return Array.from(
    Map.groupBy(ships, (ship) => ship.variant.id).values(),
    (variantShips) => ({
      variant: variantShips[0]!.variant,
      count: variantShips.length,
    }),
  );
};
