import { ACTIVE_CITIZEN_WHERE, AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext, Notification } from "../context.js";
import { ConflictError, ValidationError } from "../errors.js";
import { isLineupPublished } from "../events/eventManageRules.js";
import { lockParticipationEnabledEvent } from "../events/participatableAppEvent.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { LineupErrorMessage } from "./lineupErrors.js";
import { requireManageableEventPosition } from "./lineupGuards.js";
import {
  toLineupPositionOutput,
  type NotifyingLineupPositionWriteOutput,
} from "./lineupOutput.js";

export const assignEventPositionInputSchema = z.object({
  position_id: idSchema.describe(
    "A position of the lineup of an event (from get_event_lineup).",
  ),
  citizen_id: idSchema
    .nullable()
    .describe(
      "A participant of the event (from get_event) or a citizen who applied for the position (from get_event_lineup). Null removes the assigned citizen.",
    ),
});

export type AssignEventPositionInput = z.infer<
  typeof assignEventPositionInputSchema
>;

/**
 * The citizen of an assignment: an active participant of the event or an
 * applicant for the position, like the choices of the lineup page. A
 * participation from Discord without a citizen matches the Discord id of
 * the citizen (see `buildParticipantCitizenWhere()`).
 *
 * @throws ValidationError when the citizen does not exist or is deleted
 * @throws ConflictError when the citizen neither participates nor applied
 */
const requireAssignableCitizen = async (
  context: ApplicationContext,
  { eventId, positionId }: { eventId: string; positionId: string },
  citizenId: string,
) => {
  const citizen = await context.prisma.citizen.findFirst({
    where: { id: citizenId, ...ACTIVE_CITIZEN_WHERE },
    select: { id: true, discordId: true },
  });
  if (!citizen) throw new ValidationError(LineupErrorMessage.CitizenNotFound);

  const [participant, application] = await Promise.all([
    context.prisma.eventParticipant.findFirst({
      where: {
        eventId,
        cancelledAt: null,
        OR: [
          { citizenId: citizen.id },
          ...(citizen.discordId
            ? [{ citizenId: null, discordUserId: citizen.discordId }]
            : []),
        ],
      },
      select: { id: true },
    }),
    context.prisma.eventPositionApplication.findUnique({
      where: { positionId_citizenId: { positionId, citizenId: citizen.id } },
      select: { id: true },
    }),
  ]);
  if (!participant && !application)
    throw new ConflictError(LineupErrorMessage.CitizenNotParticipating);

  return citizen;
};

interface AssignmentChange {
  readonly eventId: string;
  readonly position: {
    readonly id: string;
    readonly name: string;
    /** The citizen before the change */
    readonly citizenId: string | null;
  };
  readonly assignedCitizenId: string | null;
}

/**
 * The new citizen gets the position, the previous citizen loses it. The
 * actor gets no notification about the own change. The router sends them
 * only while the participants see the lineup.
 */
const buildAssignmentNotifications = (
  actor: Actor,
  { eventId, position, assignedCitizenId }: AssignmentChange,
): Notification[] => {
  if (assignedCitizenId === position.citizenId) return [];

  const ownCitizenId = actor.citizen?.id;
  const notifications: Notification[] = [];

  if (assignedCitizenId !== null && assignedCitizenId !== ownCitizenId)
    notifications.push({
      type: "EventPositionAssigned",
      payload: { positionId: position.id, citizenId: assignedCitizenId },
    });

  if (position.citizenId !== null && position.citizenId !== ownCitizenId)
    notifications.push({
      type: "EventPositionUnassigned",
      payload: {
        eventId,
        citizenId: position.citizenId,
        positionId: position.id,
        positionName: position.name,
      },
    });

  return notifications;
};

/**
 * Assigns a citizen to a position of the lineup of an event that the actor
 * manages, or removes the assigned citizen. The citizen must participate in
 * the event or apply for the position. The new and the previous citizen get
 * a notification.
 */
export const assignEventPosition = (
  context: ApplicationContext,
  actor: Actor,
  input: AssignEventPositionInput,
): Promise<NotifyingLineupPositionWriteOutput> =>
  withSpan(context, "assignEventPosition", async () => {
    const { position, event } = await requireManageableEventPosition(
      context,
      actor,
      input.position_id,
    );

    const citizen =
      input.citizen_id === null
        ? null
        : await requireAssignableCitizen(
            context,
            { eventId: event.id, positionId: position.id },
            input.citizen_id,
          );

    if (citizen === null) {
      await context.prisma.eventPosition.update({
        where: { id: position.id },
        data: { citizen: { disconnect: true } },
      });

      if (position.citizenId)
        await context.audit.create([
          {
            type: AuditEventType.EVENT_POSITION_CITIZEN_REMOVED,
            data: {
              eventId: event.id,
              positionId: position.id,
              previousCitizenId: position.citizenId,
            },
            createdById: actor.userId,
          },
        ]);
    } else {
      /**
       * The lock keeps a switch of the participation to false from clearing
       * the assignments before this one. A removal needs no lock: the
       * switch removes the citizen too.
       */
      await context.prisma.$transaction(async (transaction) => {
        await lockParticipationEnabledEvent(transaction, event.id);

        await transaction.eventPosition.update({
          where: { id: position.id },
          data: { citizen: { connect: { id: citizen.id } } },
        });
      });

      await context.audit.create([
        {
          type: AuditEventType.EVENT_POSITION_CITIZEN_ASSIGNED,
          data: {
            eventId: event.id,
            positionId: position.id,
            citizenId: citizen.id,
          },
          createdById: actor.userId,
        },
      ]);
    }

    /**
     * A change of a draft lineup sends nothing: the publication names the
     * positions of each participant. Otherwise a publication right after the
     * change could arrive before the notification about the change.
     */
    const notifications = isLineupPublished(event)
      ? buildAssignmentNotifications(actor, {
          eventId: event.id,
          position,
          assignedCitizenId: citizen?.id ?? null,
        })
      : [];
    const notificationsSent = await triggerNotificationsAfterSave(
      context,
      notifications,
    );

    return {
      position: await toLineupPositionOutput(context, position.id, true),
      notifications_sent: notificationsSent,
    };
  });
