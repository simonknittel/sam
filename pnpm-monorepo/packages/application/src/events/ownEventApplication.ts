import { EventActivityType } from "@sam-monorepo/database/browser";
import {
  isPrismaError,
  PrismaErrorCode,
  type Prisma,
} from "@sam-monorepo/database/client";
import { AuditEventType, EventApplicationStatus } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { createEventActivity } from "./eventActivity.js";
import { toEventApplicationStatus } from "./eventApplicationStatus.js";
import {
  buildApplicationAuditEvents,
  withdrawOpenApplications,
} from "./eventApplications.js";
import { EventErrorMessage } from "./eventErrors.js";
import { participationTextSchema } from "./eventInputSchemas.js";
import { OPEN_INVITATION_WHERE } from "./eventInvitationStatus.js";
import { mustApplyForEvent } from "./eventManageRules.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";
import {
  lockParticipationEnabledEvent,
  requireOpenParticipatableAppEvent,
} from "./participatableAppEvent.js";

export const applyForEventInputSchema = z.object({
  event_id: idSchema,
  comment: participationTextSchema
    .optional()
    .describe(
      "A note for the managers, for example the ship. The approval makes it the comment of the sign-up.",
    ),
});

export type ApplyForEventInput = z.infer<typeof applyForEventInputSchema>;

export const withdrawEventApplicationInputSchema = z.object({
  event_id: idSchema,
});

export type WithdrawEventApplicationInput = z.infer<
  typeof withdrawEventApplicationInputSchema
>;

/** Call it in the transaction, after the lock of the event */
const requireNewApplicant = async (
  transaction: Prisma.TransactionClient,
  eventId: string,
  citizenId: string,
) => {
  const participant = await transaction.eventParticipant.findFirst({
    where: { eventId, citizenId, cancelledAt: null },
    select: { id: true },
  });
  if (participant) throw new ConflictError(EventErrorMessage.AlreadySignedUp);

  const invitation = await transaction.eventInvitation.findFirst({
    where: { eventId, citizenId, ...OPEN_INVITATION_WHERE },
    select: { id: true },
  });
  if (invitation)
    throw new ConflictError(EventErrorMessage.InvitedInsteadOfApplication);

  const latestApplication = await transaction.eventApplication.findFirst({
    where: { eventId, citizenId },
    orderBy: { createdAt: "desc" },
    select: { approvedAt: true, declinedAt: true, withdrawnAt: true },
  });
  if (!latestApplication) return;

  const status = toEventApplicationStatus(latestApplication);
  switch (status) {
    case EventApplicationStatus.Open:
      throw new ConflictError(EventErrorMessage.AlreadyApplied);

    case EventApplicationStatus.Declined:
      throw new ConflictError(EventErrorMessage.ApplicationDeclined);

    case EventApplicationStatus.Approved:
    case EventApplicationStatus.Withdrawn:
      return;

    default:
      throw new Error(`Unknown application status: ${status satisfies never}`);
  }
};

/**
 * @throws ConflictError `EventErrorMessage.ApplicationNotRequired` when the
 * user can sign up directly (see `mustApplyForEvent()`),
 * `EventErrorMessage.AlreadySignedUp`,
 * `EventErrorMessage.InvitedInsteadOfApplication`,
 * `EventErrorMessage.AlreadyApplied` and
 * `EventErrorMessage.ApplicationDeclined`
 */
export const applyForEvent = (
  context: ApplicationContext,
  actor: Actor,
  input: ApplyForEventInput,
): Promise<GetEventOutput> =>
  withSpan(context, "applyForEvent", async () => {
    const citizenId = requireCitizen(actor).id;
    requirePermission(actor, "event", "read");

    const event = await requireOpenParticipatableAppEvent(
      context,
      actor,
      input.event_id,
    );
    const comment = input.comment || null;

    let application;
    try {
      application = await context.prisma.$transaction(async (transaction) => {
        const { applicationRequired } = await lockParticipationEnabledEvent(
          transaction,
          event.id,
          { excludesParticipationWrites: true },
        );
        if (!mustApplyForEvent(actor, { ...event, applicationRequired }))
          throw new ConflictError(EventErrorMessage.ApplicationNotRequired);

        await requireNewApplicant(transaction, event.id, citizenId);

        const created = await transaction.eventApplication.create({
          data: { eventId: event.id, citizenId, comment },
          select: { id: true, citizenId: true },
        });

        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId,
          type: EventActivityType.APPLICATION_CREATED,
          payload: { comment },
        });

        return created;
      });
    } catch (error) {
      // A different tab applied in parallel
      if (isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed))
        throw new ConflictError(EventErrorMessage.AlreadyApplied);
      throw error;
    }

    await context.audit.create(
      buildApplicationAuditEvents(
        AuditEventType.EVENT_APPLICATION_CREATED,
        event.id,
        [application],
        actor.userId,
      ),
    );

    await triggerNotificationsAfterSave(context, [
      {
        type: "EventApplicationCreated",
        payload: { applicationId: application.id },
      },
    ]);

    return loadEventOutput(context, actor, event.id);
  });

/**
 * The organizers get no notification. The user can apply again.
 *
 * @throws ConflictError `EventErrorMessage.NoOpenApplication` without an open
 * application, for example when a manager answered it
 */
export const withdrawEventApplication = (
  context: ApplicationContext,
  actor: Actor,
  input: WithdrawEventApplicationInput,
): Promise<GetEventOutput> =>
  withSpan(context, "withdrawEventApplication", async () => {
    const citizenId = requireCitizen(actor).id;
    requirePermission(actor, "event", "read");

    const event = await requireOpenParticipatableAppEvent(
      context,
      actor,
      input.event_id,
    );

    const withdrawnApplications = await context.prisma.$transaction(
      (transaction) =>
        withdrawOpenApplications(transaction, {
          eventId: event.id,
          citizenIds: [citizenId],
          actorId: citizenId,
          closedAt: context.now(),
        }),
    );
    if (withdrawnApplications.length <= 0)
      throw new ConflictError(EventErrorMessage.NoOpenApplication);

    await context.audit.create(
      buildApplicationAuditEvents(
        AuditEventType.EVENT_APPLICATION_WITHDRAWN,
        event.id,
        withdrawnApplications,
        actor.userId,
      ),
    );

    return loadEventOutput(context, actor, event.id);
  });
