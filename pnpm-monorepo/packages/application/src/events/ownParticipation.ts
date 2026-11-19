import { EventActivityType, EventSource } from "@sam-monorepo/database/browser";
import type { EventParticipant } from "@sam-monorepo/database/client";
import { isPrismaError, PrismaErrorCode } from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { createEventActivity } from "./eventActivity.js";
import {
  buildApplicationAuditEvents,
  withdrawOpenApplications,
  type ApplicationOfCitizen,
} from "./eventApplications.js";
import { EventErrorMessage } from "./eventErrors.js";
import { participationTextSchema } from "./eventInputSchemas.js";
import { OPEN_INVITATION_WHERE } from "./eventInvitationStatus.js";
import { buildInvitationAuditEvents } from "./eventInvitations.js";
import {
  mustApplyForEvent,
  type EventManageInput,
} from "./eventManageRules.js";
import { lockParticipationEnabledEvent } from "./participatableAppEvent.js";

/**
 * The input of the writes of the own participation:
 * `createEventParticipation()`, `updateEventParticipationComment()` and
 * `signUpForEvent()`
 */
export const eventParticipationInputSchema = z.object({
  event_id: idSchema,
  comment: participationTextSchema
    .optional()
    .describe(
      "A note for the organizers, for example the ship. An empty text removes the comment. Without it, an existing sign-up keeps its comment.",
    ),
});

export type EventParticipationInput = z.infer<
  typeof eventParticipationInputSchema
>;

interface OwnParticipation {
  readonly eventId: string;
  readonly citizenId: string;
  readonly comment: string | null;
}

export interface OwnSignUp extends OwnParticipation {
  /** The open invitation that the sign-up accepted, or null */
  readonly acceptedInvitationId: string | null;
}

interface InsertOwnParticipationOptions {
  /**
   * Refuses the sign-up without an open invitation, for example when a
   * manager withdrew it in the meantime
   */
  readonly requireOpenInvitation?: boolean;
}

/** The active participation of the citizen at the event, or null */
export const findActiveParticipation = (
  context: ApplicationContext,
  eventId: string,
  citizenId: string,
): Promise<Pick<EventParticipant, "id" | "comment"> | null> =>
  context.prisma.eventParticipant.findFirst({
    where: {
      eventId,
      citizenId,
      cancelledAt: null,
    },
    select: {
      id: true,
      comment: true,
    },
  });

/**
 * Creates a fresh participation row. The unique index for active sign-ups
 * rejects a second active sign-up. The sign-up is the answer to an open
 * invitation of the citizen, thus it accepts the invitation. While the event
 * requires applications, only the answer to an invitation can sign the
 * citizen up, unless the citizen manages the event (see
 * `mustApplyForEvent()`). The sign-up withdraws an open application of the
 * citizen.
 *
 * @throws ConflictError `EventErrorMessage.AlreadySignedUp` when the citizen has an active
 * participation, for example from a different tab,
 * `EventErrorMessage.ParticipationDisabled` when a manager turned the
 * participation off in the meantime, `EventErrorMessage.NoOpenInvitation`
 * (see `requireOpenInvitation`) or `EventErrorMessage.ApplicationRequired`
 * when the citizen must apply for the event and has no open invitation
 */
export const insertOwnParticipation = async (
  context: ApplicationContext,
  actor: Actor,
  event: EventManageInput,
  participation: OwnParticipation,
  { requireOpenInvitation = false }: InsertOwnParticipationOptions = {},
): Promise<OwnSignUp> => {
  const { eventId, citizenId, comment } = participation;

  let acceptedInvitationId: string | null;
  let withdrawnApplications: ApplicationOfCitizen[];
  try {
    ({ acceptedInvitationId, withdrawnApplications } =
      await context.prisma.$transaction(async (transaction) => {
        const { applicationRequired } = await lockParticipationEnabledEvent(
          transaction,
          eventId,
        );

        /**
         * Before the sign-up: each write that closes an application locks the
         * application first, thus two writes cannot wait for each other
         */
        const withdrawn = await withdrawOpenApplications(transaction, {
          eventId,
          citizenIds: [citizenId],
          actorId: citizenId,
          closedAt: context.now(),
        });

        await transaction.eventParticipant.create({
          data: {
            eventId,
            source: EventSource.APP,
            citizenId,
            comment,
          },
        });

        const [acceptedInvitation] =
          await transaction.eventInvitation.updateManyAndReturn({
            where: { eventId, citizenId, ...OPEN_INVITATION_WHERE },
            data: { acceptedAt: context.now() },
            select: { id: true },
          });

        if (!acceptedInvitation) {
          if (requireOpenInvitation)
            throw new ConflictError(EventErrorMessage.NoOpenInvitation);
          if (mustApplyForEvent(actor, { ...event, applicationRequired }))
            throw new ConflictError(EventErrorMessage.ApplicationRequired);
        }

        await createEventActivity(transaction, {
          eventId,
          citizenId,
          type: acceptedInvitation
            ? EventActivityType.INVITATION_ACCEPTED
            : EventActivityType.PARTICIPATION_SIGNED_UP,
          payload: { comment },
        });

        return {
          acceptedInvitationId: acceptedInvitation?.id ?? null,
          withdrawnApplications: withdrawn,
        };
      }));
  } catch (error) {
    if (isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed))
      throw new ConflictError(EventErrorMessage.AlreadySignedUp);
    throw error;
  }

  await context.audit.create([
    {
      type: AuditEventType.EVENT_PARTICIPATION_SIGNED_UP,
      data: { eventId, citizenId },
      createdById: actor.userId,
    },
    ...(acceptedInvitationId
      ? buildInvitationAuditEvents(
          AuditEventType.EVENT_INVITATION_ACCEPTED,
          eventId,
          [{ id: acceptedInvitationId, citizenId }],
          actor.userId,
        )
      : []),
    ...buildApplicationAuditEvents(
      AuditEventType.EVENT_APPLICATION_WITHDRAWN,
      eventId,
      withdrawnApplications,
      actor.userId,
    ),
  ]);

  return { ...participation, acceptedInvitationId };
};

/** Replaces the comment of an active participation */
export const writeOwnParticipationComment = async (
  context: ApplicationContext,
  actor: Actor,
  participantId: string,
  { eventId, citizenId, comment }: OwnParticipation,
) => {
  await context.prisma.$transaction(async (transaction) => {
    await transaction.eventParticipant.update({
      where: {
        id: participantId,
      },
      data: {
        comment,
      },
    });

    await createEventActivity(transaction, {
      eventId,
      citizenId,
      type: EventActivityType.PARTICIPATION_COMMENT_UPDATED,
      payload: { comment },
    });
  });

  await context.audit.create([
    {
      type: AuditEventType.EVENT_PARTICIPATION_COMMENT_UPDATED,
      data: { eventId, citizenId },
      createdById: actor.userId,
    },
  ]);
};
