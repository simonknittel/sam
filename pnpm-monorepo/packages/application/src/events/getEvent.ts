import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import {
  CITIZEN_REFERENCE_SELECT,
  toCitizenReference,
  toCitizenReferences,
  type CitizenReference,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import {
  isAllowedToManageEvent,
  isAllowedToManagePositions,
  isEventUpdatable,
} from "./eventManageRules.js";
import {
  toEventSourceType,
  toEventVisibilityType,
  type EventSourceType,
  type EventVisibilityType,
} from "./eventOutput.js";
import { EVENT_DETAILS_INCLUDE, type EventDetails } from "./eventSelects.js";
import { findVisibleEvent } from "./findVisibleEvent.js";
import { buildParticipantCitizenWhere } from "./participantCitizenWhere.js";

export const getEventInputSchema = z.object({
  event_id: idSchema,
});

export type GetEventInput = z.infer<typeof getEventInputSchema>;

export interface EventParticipantEntry {
  /** Null when the citizen is deleted */
  readonly citizen: CitizenReference | null;
  readonly comment: string | null;
  readonly created_at: string;
}

export interface GetEventOutput {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly start_time: string;
  /** Null when the event has no explicit end */
  readonly end_time: string | null;
  readonly location: string | null;
  readonly visibility: EventVisibilityType;
  /**
   * The roles that see a restricted event. Empty when the actor cannot manage
   * the event: only the settings page of the event shows them.
   */
  readonly visibility_role_ids: string[];
  readonly source: EventSourceType;
  readonly lineup_enabled: boolean;
  /**
   * False when a manager turned off the participation: nobody can sign up
   * or be added, and the lineup is hidden. Always true for a Discord event.
   */
  readonly participation_enabled: boolean;
  readonly created_by: CitizenReference | null;
  readonly managers: CitizenReference[];
  /**
   * The active participations, in the order of the sign-up. Like the
   * participants page, a Discord sign-up shows only after a citizen has its
   * Discord id.
   */
  readonly participants: EventParticipantEntry[];
  readonly can_manage: boolean;
  readonly can_manage_positions: boolean;
  /** False when the event has ended: then nothing can change */
  readonly is_updatable: boolean;
  readonly is_participating: boolean;
}

const getParticipantEntries = async (
  context: ApplicationContext,
  participants: EventDetails["participants"],
): Promise<EventParticipantEntry[]> => {
  const citizens = await context.prisma.citizen.findMany({
    where: buildParticipantCitizenWhere(participants),
    select: { ...CITIZEN_REFERENCE_SELECT, discordId: true },
  });

  return participants
    .toSorted(
      (first, second) => first.createdAt.getTime() - second.createdAt.getTime(),
    )
    .flatMap((participant) => {
      // A Discord id finds only citizens that are not deleted, like
      // `buildParticipantCitizenWhere()`
      const citizen = participant.citizenId
        ? citizens.find((citizen) => citizen.id === participant.citizenId)
        : citizens.find(
            (citizen) =>
              citizen.deletedAt === null &&
              participant.discordUserId !== null &&
              citizen.discordId === participant.discordUserId,
          );
      if (!citizen) return [];

      return {
        citizen: toCitizenReference(citizen),
        comment: participant.comment,
        created_at: participant.createdAt.toISOString(),
      };
    });
};

/**
 * Maps an event to the output of `getEvent()`. It checks nothing: the caller
 * checked that the actor can see the event, or that the actor just changed
 * it.
 */
const toEventOutput = async (
  context: ApplicationContext,
  actor: Actor,
  event: EventDetails,
): Promise<GetEventOutput> => {
  const citizenId = actor.citizen?.id ?? null;
  const { discordUserId } = actor;

  const participants = await getParticipantEntries(context, event.participants);

  const canManage = isAllowedToManageEvent(actor, event);

  return {
    id: event.id,
    name: event.name,
    description: event.description,
    start_time: event.startTime.toISOString(),
    end_time: event.endTime?.toISOString() ?? null,
    location: event.location,
    visibility: toEventVisibilityType(event.visibility),
    visibility_role_ids: canManage
      ? event.visibilityRoles.map((visibilityRole) => visibilityRole.roleId)
      : [],
    source: toEventSourceType(event.source),
    lineup_enabled: event.lineupEnabled,
    participation_enabled: event.participationEnabled,
    created_by: toCitizenReference(event.createdBy),
    managers: toCitizenReferences(event.managers),
    participants,
    can_manage: canManage,
    can_manage_positions: isAllowedToManagePositions(actor, event),
    is_updatable: isEventUpdatable(event, context.now()),
    is_participating: event.participants.some(
      (participant) =>
        (citizenId !== null && participant.citizenId === citizenId) ||
        (discordUserId !== null && participant.discordUserId === discordUserId),
    ),
  };
};

/**
 * The output of an event that a write use case changed. Without a visibility
 * check: the use case checked its operation, and the operation can take the
 * visibility away, for example from a manager who removes themselves from a
 * restricted event.
 */
export const loadEventOutput = async (
  context: ApplicationContext,
  actor: Actor,
  eventId: string,
): Promise<GetEventOutput> =>
  toEventOutput(
    context,
    actor,
    await context.prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      include: EVENT_DETAILS_INCLUDE,
    }),
  );

/**
 * One event that the actor can see, with its participants and managers and
 * what the actor can do with it
 */
export const getEvent = (
  context: ApplicationContext,
  actor: Actor,
  input: GetEventInput,
): Promise<GetEventOutput> =>
  withSpan(context, "getEvent", async () => {
    requirePermission(actor, "event", "read");

    // Like the participants page of the app, which requires a citizen
    requireCitizen(actor);

    return toEventOutput(
      context,
      actor,
      await findVisibleEvent(context, actor, input.event_id),
    );
  });
