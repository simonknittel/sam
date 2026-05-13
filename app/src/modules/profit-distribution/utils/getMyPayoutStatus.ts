import type {
  ProfitDistributionCycle,
  ProfitDistributionCycleParticipant,
} from "@/generated/prisma/client";

export enum PayoutState {
  NOT_PARTICIPATING,
  PAYOUT_NOT_YET_STARTED,
  AWAITING_ACCEPTANCE,
  AWAITING_PAYOUT,
  DISBURSED,
  EXPIRED,
  UNKNOWN,
  PAYOUT_OVERDUE,
  CEDED,
}

export const getPayoutState = (
  cycle: ProfitDistributionCycle,
  myParticipant: ProfitDistributionCycleParticipant | null | undefined,
) => {
  if (!myParticipant) return PayoutState.NOT_PARTICIPATING;

  if (myParticipant.disbursedAt) return PayoutState.DISBURSED;

  if (myParticipant.cededAt) return PayoutState.CEDED;

  const now = new Date();
  if (!cycle.payoutStartedAt || cycle.payoutStartedAt > now)
    return PayoutState.PAYOUT_NOT_YET_STARTED;

  if (
    cycle.payoutStartedAt <= now &&
    (!cycle.payoutEndedAt || cycle.payoutEndedAt > now) &&
    !myParticipant.acceptedAt
  )
    return PayoutState.AWAITING_ACCEPTANCE;

  if (
    cycle.payoutStartedAt <= now &&
    myParticipant.acceptedAt &&
    (!cycle.payoutEndedAt || cycle.payoutEndedAt > now) &&
    !myParticipant.disbursedAt
  )
    return PayoutState.AWAITING_PAYOUT;

  if (
    cycle.payoutEndedAt &&
    cycle.payoutEndedAt <= now &&
    !myParticipant.acceptedAt
  )
    return PayoutState.EXPIRED;

  if (
    cycle.payoutEndedAt &&
    cycle.payoutEndedAt <= now &&
    myParticipant.acceptedAt &&
    !myParticipant.disbursedAt
  )
    return PayoutState.PAYOUT_OVERDUE;

  return PayoutState.UNKNOWN;
};
