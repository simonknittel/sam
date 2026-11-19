import { EventActivityType } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  EVENT_MAX_CITIZENS_PER_REQUEST,
  EventApplicationAnswer,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ValidationError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { findAddableParticipantIds } from "./addableParticipants.js";
import { createEventActivity } from "./eventActivity.js";
import { OPEN_APPLICATION_WHERE } from "./eventApplicationStatus.js";
import {
  admitApplicants,
  buildApplicationAnsweredNotifications,
  buildApplicationAuditEvents,
} from "./eventApplications.js";
import { EventErrorMessage } from "./eventErrors.js";
import { participationTextSchema } from "./eventInputSchemas.js";
import { buildInvitationAuditEvents } from "./eventInvitations.js";
import { requireManageableEvent } from "./eventManageGuard.js";
import { isAllowedToManageEvent } from "./eventManageRules.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";
import {
  lockParticipationEnabledEvent,
  requireParticipatableAppEvent,
} from "./participatableAppEvent.js";

export const approveEventApplicationsInputSchema = z.object({
  event_id: idSchema,
  citizen_ids: z
    .array(idSchema)
    .max(EVENT_MAX_CITIZENS_PER_REQUEST)
    .describe("Citizens with an open application for the event."),
});

export type ApproveEventApplicationsInput = z.infer<
  typeof approveEventApplicationsInputSchema
>;

export const declineEventApplicationsInputSchema =
  approveEventApplicationsInputSchema.extend({
    reason: participationTextSchema
      .optional()
      .describe(
        "Why the applications are declined. Each citizen gets it in the notification.",
      ),
  });

export type DeclineEventApplicationsInput = z.infer<
  typeof declineEventApplicationsInputSchema
>;

export interface ApproveEventApplicationsOutput {
  /** The event after the write, like `getEvent()` */
  readonly event: GetEventOutput;
  readonly approved_citizen_ids: string[];
}

export interface DeclineEventApplicationsOutput {
  /** The event after the write, like `getEvent()` */
  readonly event: GetEventOutput;
  readonly declined_citizen_ids: string[];
}

/**
 * The event and the citizens of a manager's answer to applications
 *
 * @throws NotFoundError, ConflictError, ForbiddenError or ValidationError
 */
const requireAnswerableApplications = async (
  context: ApplicationContext,
  actor: Actor,
  input: ApproveEventApplicationsInput,
) => {
  requirePermission(actor, "event", "read");

  const event = await requireParticipatableAppEvent(
    context,
    actor,
    input.event_id,
  );
  requireManageableEvent(context, actor, event, isAllowedToManageEvent);

  const citizenIds = Array.from(new Set(input.citizen_ids));
  if (citizenIds.length <= 0)
    throw new ValidationError(EventErrorMessage.NoCitizenSelected);

  return { event, citizenIds, managerId: actor.citizen?.id ?? null };
};

/**
 * A manager approves the open applications of citizens for an app event:
 * each citizen is signed up with the comment of the application and gets a
 * notification, except the actor. The sign-up replaces an open invitation of
 * the citizen, thus the use case withdraws it. Like a direct add, it needs
 * citizens who can see the event, log in and get its notifications.
 *
 * @throws ConflictError `EventErrorMessage.CitizenNotApplied` when a citizen
 * has no open application, ValidationError
 * `EventErrorMessage.CitizenCannotSeeEvent`; then nothing changes
 */
export const approveEventApplications = (
  context: ApplicationContext,
  actor: Actor,
  input: ApproveEventApplicationsInput,
): Promise<ApproveEventApplicationsOutput> =>
  withSpan(context, "approveEventApplications", async () => {
    const { event, citizenIds, managerId } =
      await requireAnswerableApplications(context, actor, input);

    /**
     * For example, a manager restricted the event after the application. A
     * sign-up would then be invisible to the citizen, who could not cancel
     * it.
     */
    const addableCitizenIds = new Set(
      await findAddableParticipantIds(context.prisma, event, citizenIds),
    );
    if (citizenIds.some((citizenId) => !addableCitizenIds.has(citizenId)))
      throw new ValidationError(EventErrorMessage.CitizenCannotSeeEvent);

    const admitted = await context.prisma.$transaction(async (transaction) => {
      await lockParticipationEnabledEvent(transaction, event.id);

      const result = await admitApplicants(transaction, {
        eventId: event.id,
        citizenIds,
        actorId: managerId,
        closedAt: context.now(),
      });

      /**
       * A citizen withdrew the application, or a different manager answered
       * it before. The error rolls back the other approvals.
       */
      if (result.approvedApplications.length < citizenIds.length)
        throw new ConflictError(EventErrorMessage.CitizenNotApplied);

      return result;
    });

    await context.audit.create([
      ...buildApplicationAuditEvents(
        AuditEventType.EVENT_APPLICATION_APPROVED,
        event.id,
        admitted.approvedApplications,
        actor.userId,
      ),
      ...buildInvitationAuditEvents(
        AuditEventType.EVENT_INVITATION_WITHDRAWN,
        event.id,
        admitted.withdrawnInvitations,
        actor.userId,
      ),
    ]);

    await triggerNotificationsAfterSave(
      context,
      buildApplicationAnsweredNotifications(
        event.id,
        admitted.approvedApplications,
        EventApplicationAnswer.Approved,
        { reason: null, actorCitizenId: managerId },
      ),
    );

    return {
      event: await loadEventOutput(context, actor, event.id),
      approved_citizen_ids: citizenIds,
    };
  });

/**
 * A manager declines the open applications of citizens for an app event,
 * with an optional reason. Each citizen gets a notification, except the
 * actor, and cannot apply again. A manager can still add or invite the
 * citizen.
 *
 * @throws ConflictError `EventErrorMessage.CitizenNotApplied` when a citizen
 * has no open application; then nothing changes
 */
export const declineEventApplications = (
  context: ApplicationContext,
  actor: Actor,
  input: DeclineEventApplicationsInput,
): Promise<DeclineEventApplicationsOutput> =>
  withSpan(context, "declineEventApplications", async () => {
    const { event, citizenIds, managerId } =
      await requireAnswerableApplications(context, actor, input);
    const reason = input.reason || null;

    const declinedApplications = await context.prisma.$transaction(
      async (transaction) => {
        const declined = await transaction.eventApplication.updateManyAndReturn(
          {
            where: {
              eventId: event.id,
              citizenId: { in: citizenIds },
              ...OPEN_APPLICATION_WHERE,
            },
            data: {
              declinedAt: context.now(),
              declinedById: managerId,
              declineReason: reason,
            },
            select: { id: true, citizenId: true },
          },
        );

        // See `approveEventApplications()`
        if (declined.length < citizenIds.length)
          throw new ConflictError(EventErrorMessage.CitizenNotApplied);

        for (const application of declined)
          await createEventActivity(transaction, {
            eventId: event.id,
            citizenId: managerId,
            type: EventActivityType.APPLICATION_DECLINED,
            payload: { citizenId: application.citizenId, reason },
          });

        return declined;
      },
    );

    await context.audit.create(
      buildApplicationAuditEvents(
        AuditEventType.EVENT_APPLICATION_DECLINED,
        event.id,
        declinedApplications,
        actor.userId,
      ),
    );

    await triggerNotificationsAfterSave(
      context,
      buildApplicationAnsweredNotifications(
        event.id,
        declinedApplications,
        EventApplicationAnswer.Declined,
        { reason, actorCitizenId: managerId },
      ),
    );

    return {
      event: await loadEventOutput(context, actor, event.id),
      declined_citizen_ids: citizenIds,
    };
  });
