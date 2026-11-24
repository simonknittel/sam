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

export interface EventOption {
  readonly id: string;
  readonly name: string;
  readonly startTime: Date;
}

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

const ACTIVE_PARTICIPANTS_SELECT = {
  participants: EVENT_PAGE_RELATIONS_SELECT.participants,
} as const satisfies Prisma.EventSelect;

export type EventParticipantRow = Prisma.EventParticipantGetPayload<{
  select: (typeof EVENT_PAGE_RELATIONS_SELECT)["participants"]["select"];
}>;

export interface ResolvedEventParticipantCitizen extends CitizenReferenceRow {
  readonly discordId: string | null;
  readonly roleAssignments: Pick<RoleAssignment, "roleId" | "currentLevel">[];
}

export interface ResolvedEventParticipant {
  readonly participant: EventParticipantRow | undefined;
  readonly citizen: ResolvedEventParticipantCitizen;
}

/** A sign-up of a deleted citizen stays in the list */
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
