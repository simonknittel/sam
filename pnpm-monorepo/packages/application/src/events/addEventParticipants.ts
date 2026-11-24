import { EventActivityType, EventSource } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  EVENT_MAX_CITIZENS_PER_REQUEST,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { selectNewParticipantIds } from "./addableParticipants.js";
import { createEventActivity } from "./eventActivity.js";
import {
  approveOpenApplications,
  buildApplicationAuditEvents,
} from "./eventApplications.js";
import { participationTextSchema } from "./eventInputSchemas.js";
import {
  buildInvitationAuditEvents,
  withdrawOpenInvitations,
} from "./eventInvitations.js";
import { requireManageableEvent } from "./eventManageGuard.js";
import { isAllowedToManageEvent } from "./eventManageRules.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";
import {
  lockParticipationEnabledEvent,
  requireParticipatableAppEvent,
} from "./participatableAppEvent.js";

export const addEventParticipantsInputSchema = z.object({
  event_id: idSchema,
  citizen_ids: z
    .array(idSchema)
    .max(EVENT_MAX_CITIZENS_PER_REQUEST)
    .describe(
      "The citizens to sign up. Each must be able to see the event, log in and get event notifications. Citizens who are already signed up are skipped. An open invitation of an added citizen is withdrawn, and an open application is approved.",
    ),
  comment: participationTextSchema
    .optional()
    .describe("The comment of each new sign-up."),
});

export type AddEventParticipantsInput = z.infer<
  typeof addEventParticipantsInputSchema
>;

export interface AddEventParticipantsOutput {
  readonly event: GetEventOutput;
  readonly added_citizen_ids: string[];
}

export const addEventParticipants = (
  context: ApplicationContext,
  actor: Actor,
  input: AddEventParticipantsInput,
): Promise<AddEventParticipantsOutput> =>
  withSpan(context, "addEventParticipants", async () => {
    requirePermission(actor, "event", "read");

    const event = await requireParticipatableAppEvent(
      context,
      actor,
      input.event_id,
    );
    requireManageableEvent(context, actor, event, isAllowedToManageEvent);

    const managerId = actor.citizen?.id ?? null;

    const citizenIdsToAdd = await selectNewParticipantIds(
      context.prisma,
      event,
      input.citizen_ids,
    );

    /**
     * One transaction, so a failure part-way through cannot leave
     * participations behind that never reach the audit log or the affected
     * citizens. `skipDuplicates` absorbs the one race the pre-check cannot
     * close: a citizen signing themselves up in between.
     */
    const comment = input.comment || null;

    const { addedCitizenIds, withdrawnInvitations, approvedApplications } =
      citizenIdsToAdd.length > 0
        ? await context.prisma.$transaction(async (transaction) => {
            await lockParticipationEnabledEvent(transaction, event.id);

            /**
             * Before the sign-ups: each write that closes an application
             * locks the application first, thus two writes cannot wait for
             * each other
             */
            const approved = await approveOpenApplications(transaction, {
              eventId: event.id,
              citizenIds: citizenIdsToAdd,
              actorId: managerId,
              closedAt: context.now(),
            });

            const created =
              await transaction.eventParticipant.createManyAndReturn({
                data: citizenIdsToAdd.map((citizenId) => ({
                  eventId: event.id,
                  source: EventSource.APP,
                  citizenId,
                  comment,
                })),
                skipDuplicates: true,
                select: { citizenId: true },
              });

            const citizenIds = created.map(
              (participant) => participant.citizenId!,
            );

            for (const citizenId of citizenIds)
              await createEventActivity(transaction, {
                eventId: event.id,
                citizenId: managerId,
                type: EventActivityType.PARTICIPATION_ADDED_BY_MANAGER,
                payload: { citizenId, comment },
              });

            return {
              addedCitizenIds: citizenIds,
              withdrawnInvitations: await withdrawOpenInvitations(transaction, {
                eventId: event.id,
                citizenIds,
                withdrawnById: managerId,
                withdrawnAt: context.now(),
              }),
              approvedApplications: approved,
            };
          })
        : {
            addedCitizenIds: [],
            withdrawnInvitations: [],
            approvedApplications: [],
          };

    if (addedCitizenIds.length <= 0)
      return {
        event: await loadEventOutput(context, actor, event.id),
        added_citizen_ids: [],
      };

    await context.audit.create([
      ...addedCitizenIds.map((citizenId) => ({
        type: AuditEventType.EVENT_PARTICIPANT_ADDED_BY_MANAGER as const,
        data: {
          eventId: event.id,
          citizenId,
        },
        createdById: actor.userId,
      })),
      ...buildInvitationAuditEvents(
        AuditEventType.EVENT_INVITATION_WITHDRAWN,
        event.id,
        withdrawnInvitations,
        actor.userId,
      ),
      ...buildApplicationAuditEvents(
        AuditEventType.EVENT_APPLICATION_APPROVED,
        event.id,
        approvedApplications,
        actor.userId,
      ),
    ]);

    await triggerNotificationsAfterSave(
      context,
      addedCitizenIds
        .filter((citizenId) => citizenId !== managerId)
        .map((citizenId) => ({
          type: "EventParticipationAdded",
          payload: {
            eventId: event.id,
            citizenId,
          },
        })),
    );

    return {
      event: await loadEventOutput(context, actor, event.id),
      added_citizen_ids: addedCitizenIds,
    };
  });
