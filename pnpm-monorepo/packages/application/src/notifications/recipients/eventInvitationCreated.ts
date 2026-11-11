import { EventInvitationStatus } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../../context.js";
import { toEventInvitationStatus } from "../../events/eventInvitationStatus.js";
import { findEventCitizenRecipient } from "./eventCitizen.js";
import type { EventNotificationRecipients } from "./eventRecipients.js";

export interface EventInvitationRecipient extends EventNotificationRecipients {
  readonly invitation: {
    readonly id: string;
    readonly message: string | null;
    /** Null for a manager without a handle or without a citizen */
    readonly invitedByHandle: string | null;
  };
}

/**
 * The invited citizen, when the citizen can see the event now (see
 * `findEventCitizenRecipient()`). Null when the invitation does not exist or
 * is not open anymore: a citizen who answered it or whose invitation a
 * manager withdrew needs no notification.
 */
export const findEventInvitationRecipient = async (
  context: ApplicationContext,
  { invitationId }: { readonly invitationId: string },
): Promise<EventInvitationRecipient | null> => {
  const invitation = await context.prisma.eventInvitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      eventId: true,
      citizenId: true,
      message: true,
      acceptedAt: true,
      declinedAt: true,
      withdrawnAt: true,
      createdBy: { select: { handle: true } },
    },
  });
  if (
    !invitation ||
    toEventInvitationStatus(invitation) !== EventInvitationStatus.Open
  )
    return null;

  const result = await findEventCitizenRecipient(context, {
    eventId: invitation.eventId,
    citizenId: invitation.citizenId,
  });
  if (!result) return null;

  return {
    ...result,
    invitation: {
      id: invitation.id,
      message: invitation.message,
      invitedByHandle: invitation.createdBy?.handle ?? null,
    },
  };
};
