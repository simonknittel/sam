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
import { EventErrorMessage } from "./eventErrors.js";
import { participationTextSchema } from "./eventInputSchemas.js";
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
 * rejects a second active sign-up.
 *
 * @throws ConflictError `EventErrorMessage.AlreadySignedUp` when the citizen has an active
 * participation, for example from a different tab, or
 * `EventErrorMessage.ParticipationDisabled` when a manager turned the
 * participation off in the meantime
 */
export const insertOwnParticipation = async (
  context: ApplicationContext,
  actor: Actor,
  { eventId, citizenId, comment }: OwnParticipation,
) => {
  try {
    await context.prisma.$transaction(async (transaction) => {
      await lockParticipationEnabledEvent(transaction, eventId);

      await transaction.eventParticipant.create({
        data: {
          eventId,
          source: EventSource.APP,
          citizenId,
          comment,
        },
      });

      await createEventActivity(transaction, {
        eventId,
        citizenId,
        type: EventActivityType.PARTICIPATION_SIGNED_UP,
        payload: { comment },
      });
    });
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
  ]);
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
