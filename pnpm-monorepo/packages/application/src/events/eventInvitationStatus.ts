import type { EventInvitation, Prisma } from "@sam-monorepo/database/client";
import { EventInvitationStatus } from "@sam-monorepo/domain";

/** An invitation without a result. The unique index permits one per citizen and event. */
export const OPEN_INVITATION_WHERE = {
  acceptedAt: null,
  declinedAt: null,
  withdrawnAt: null,
} as const satisfies Prisma.EventInvitationWhereInput;

/** A CHECK constraint permits at most one result */
export const toEventInvitationStatus = (
  invitation: Pick<
    EventInvitation,
    "acceptedAt" | "declinedAt" | "withdrawnAt"
  >,
): EventInvitationStatus => {
  if (invitation.acceptedAt) return EventInvitationStatus.Accepted;
  if (invitation.declinedAt) return EventInvitationStatus.Declined;
  if (invitation.withdrawnAt) return EventInvitationStatus.Withdrawn;
  return EventInvitationStatus.Open;
};
