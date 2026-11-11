import {
  AuditEventType,
  EVENT_MAX_CITIZENS_PER_REQUEST,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { EventErrorMessage } from "./eventErrors.js";
import {
  buildInvitationAuditEvents,
  withdrawOpenInvitations,
} from "./eventInvitations.js";
import { requireManageableEvent } from "./eventManageGuard.js";
import { isAllowedToManageEvent } from "./eventManageRules.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";
import { requireParticipatableAppEvent } from "./participatableAppEvent.js";

export const withdrawEventInvitationsInputSchema = z.object({
  event_id: idSchema,
  citizen_ids: z
    .array(idSchema)
    .max(EVENT_MAX_CITIZENS_PER_REQUEST)
    .describe("Citizens with an open invitation to the event."),
});

export type WithdrawEventInvitationsInput = z.infer<
  typeof withdrawEventInvitationsInputSchema
>;

export interface WithdrawEventInvitationsOutput {
  /** The event after the write, like `getEvent()` */
  readonly event: GetEventOutput;
  readonly withdrawn_citizen_ids: string[];
}

/**
 * A manager withdraws the open invitations of citizens to an app event. The
 * citizens get no notification: their invitation notification shows that the
 * invitation is withdrawn.
 */
export const withdrawEventInvitations = (
  context: ApplicationContext,
  actor: Actor,
  input: WithdrawEventInvitationsInput,
): Promise<WithdrawEventInvitationsOutput> =>
  withSpan(context, "withdrawEventInvitations", async () => {
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

    const withdrawnInvitations = await context.prisma.$transaction(
      async (transaction) => {
        const withdrawn = await withdrawOpenInvitations(transaction, {
          eventId: event.id,
          citizenIds,
          withdrawnById: actor.citizen?.id ?? null,
          withdrawnAt: context.now(),
        });

        /**
         * A citizen answered, or a different manager withdrew the invitation
         * before. The error rolls back the other withdrawals.
         */
        if (withdrawn.length < citizenIds.length)
          throw new ConflictError(EventErrorMessage.CitizenNotInvited);

        return withdrawn;
      },
    );

    await context.audit.create(
      buildInvitationAuditEvents(
        AuditEventType.EVENT_INVITATION_WITHDRAWN,
        event.id,
        withdrawnInvitations,
        actor.userId,
      ),
    );

    return {
      event: await loadEventOutput(context, actor, event.id),
      withdrawn_citizen_ids: citizenIds,
    };
  });
