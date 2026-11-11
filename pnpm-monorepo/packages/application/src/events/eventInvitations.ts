import { EventActivityType } from "@sam-monorepo/database/browser";
import type { Citizen, Event, Prisma } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  EventInvitationAnswer,
  type AuditEventInput,
} from "@sam-monorepo/domain";
import type { Notification } from "../context.js";
import { createEventActivity } from "./eventActivity.js";
import { OPEN_INVITATION_WHERE } from "./eventInvitationStatus.js";

export interface InvitationOfCitizen {
  readonly id: string;
  readonly citizenId: string;
}

interface WithdrawOpenInvitationsInput {
  readonly eventId: Event["id"];
  /** All open invitations of the event without it */
  readonly citizenIds?: readonly Citizen["id"][];
  readonly withdrawnById: Citizen["id"] | null;
  readonly withdrawnAt: Date;
}

/**
 * Withdraws the open invitations of the citizens at the event and writes an
 * activity entry for each of them. Takes the transaction client, thus the
 * entries commit together with the change that withdrew the invitations.
 */
export const withdrawOpenInvitations = async (
  transaction: Prisma.TransactionClient,
  {
    eventId,
    citizenIds,
    withdrawnById,
    withdrawnAt,
  }: WithdrawOpenInvitationsInput,
): Promise<InvitationOfCitizen[]> => {
  const withdrawn = await transaction.eventInvitation.updateManyAndReturn({
    where: {
      eventId,
      ...(citizenIds ? { citizenId: { in: [...citizenIds] } } : {}),
      ...OPEN_INVITATION_WHERE,
    },
    data: {
      withdrawnAt,
      withdrawnById,
    },
    select: { id: true, citizenId: true },
  });

  for (const invitation of withdrawn)
    await createEventActivity(transaction, {
      eventId,
      citizenId: withdrawnById,
      type: EventActivityType.INVITATION_WITHDRAWN,
      payload: { citizenId: invitation.citizenId },
    });

  return withdrawn;
};

export const buildInvitationAuditEvents = (
  type:
    | AuditEventType.EVENT_PARTICIPANT_INVITED
    | AuditEventType.EVENT_INVITATION_ACCEPTED
    | AuditEventType.EVENT_INVITATION_DECLINED
    | AuditEventType.EVENT_INVITATION_WITHDRAWN,
  eventId: Event["id"],
  invitations: readonly InvitationOfCitizen[],
  createdById: string,
): AuditEventInput[] =>
  invitations.map((invitation) => ({
    type,
    data: {
      eventId,
      citizenId: invitation.citizenId,
      invitationId: invitation.id,
    },
    createdById,
  }));

/**
 * The notification of the organizers about the answer of an invited citizen
 * (see `findEventOrganizerRecipients()`). Unlike a sign-up, an answer
 * notifies at each time: the organizers asked for it.
 */
export const buildInvitationAnsweredNotification = (
  eventId: Event["id"],
  citizenId: Citizen["id"],
  answer: EventInvitationAnswer,
  comment: string | null,
): Notification => ({
  type: "EventInvitationAnswered",
  payload: {
    eventId,
    citizenId,
    answer,
    comment,
  },
});
