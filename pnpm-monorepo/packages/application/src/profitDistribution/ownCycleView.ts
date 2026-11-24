import type {
  ProfitDistributionCycle,
  ProfitDistributionCycleParticipant,
} from "@sam-monorepo/database/client";
import {
  CyclePhase,
  getAuecPerSilc,
  getCurrentPhase,
  getPayoutState,
  getTotalSilc,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";

type ParticipantState = Pick<
  ProfitDistributionCycleParticipant,
  "citizenId" | "silcBalanceSnapshot" | "cededAt" | "acceptedAt" | "disbursedAt"
>;

/**
 * `auecPerSilc` is null until the payout starts. Only a cycle in the collection
 * phase uses `ownSilcBalance`, the current balance of the actor: the later
 * phases use the snapshot of the participant.
 */
export const getOwnCycleView = <Participant extends ParticipantState>(
  cycle: Pick<
    ProfitDistributionCycle,
    "collectionEndedAt" | "payoutStartedAt" | "payoutEndedAt" | "auecProfit"
  > & { readonly participants: Participant[] },
  actor: Actor,
  ownSilcBalance: number,
) => {
  const currentPhase = getCurrentPhase(cycle);
  const myParticipant = cycle.participants.find(
    (participant) => participant.citizenId === actor.citizen?.id,
  );

  return {
    currentPhase,
    myParticipant,
    mySilcBalance:
      currentPhase === CyclePhase.Collection
        ? ownSilcBalance
        : myParticipant?.silcBalanceSnapshot || 0,
    auecPerSilc:
      cycle.auecProfit !== null
        ? getAuecPerSilc(cycle.auecProfit, getTotalSilc(cycle.participants))
        : null,
    myPayoutState: getPayoutState(cycle, myParticipant),
  };
};
