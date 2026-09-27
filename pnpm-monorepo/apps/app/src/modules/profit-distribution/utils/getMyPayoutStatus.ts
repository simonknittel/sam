import type {
  ProfitDistributionCycle,
  ProfitDistributionCycleParticipant,
} from "@sam-monorepo/database/client";
import { CyclePhase, getCurrentPhase } from "@sam-monorepo/domain";

export enum PayoutState {
  NOT_PARTICIPATING,
  PAYOUT_NOT_YET_STARTED,
  AWAITING_ACCEPTANCE,
  AWAITING_PAYOUT,
  DISBURSED,
  EXPIRED,
  PAYOUT_OVERDUE,
  CEDED,
}

export const getPayoutState = (
  cycle: Pick<
    ProfitDistributionCycle,
    "collectionEndedAt" | "payoutStartedAt" | "payoutEndedAt"
  >,
  myParticipant:
    | Pick<
        ProfitDistributionCycleParticipant,
        "cededAt" | "acceptedAt" | "disbursedAt"
      >
    | null
    | undefined,
) => {
  if (!myParticipant) return PayoutState.NOT_PARTICIPATING;

  if (myParticipant.disbursedAt) return PayoutState.DISBURSED;

  if (myParticipant.cededAt) return PayoutState.CEDED;

  const phase = getCurrentPhase(cycle);
  switch (phase) {
    case CyclePhase.Collection:
    case CyclePhase.PayoutPreparation:
      return PayoutState.PAYOUT_NOT_YET_STARTED;

    case CyclePhase.Payout:
      return myParticipant.acceptedAt
        ? PayoutState.AWAITING_PAYOUT
        : PayoutState.AWAITING_ACCEPTANCE;

    case CyclePhase.Completed:
      return myParticipant.acceptedAt
        ? PayoutState.PAYOUT_OVERDUE
        : PayoutState.EXPIRED;

    default:
      throw new Error(`Unknown cycle phase: ${phase satisfies never}`);
  }
};
