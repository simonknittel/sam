import type { ProfitDistributionCycle } from "@/generated/prisma/client";

export enum CyclePhase {
  Collection,
  PayoutPreparation,
  Payout,
  Completed,
}

export const getCurrentPhase = (cycle: ProfitDistributionCycle) => {
  let currentPhase = CyclePhase.Collection;

  const now = new Date();

  if (cycle.collectionEndedAt < now)
    currentPhase = CyclePhase.PayoutPreparation;

  if (cycle.payoutStartedAt && cycle.payoutStartedAt < now)
    currentPhase = CyclePhase.Payout;

  if (cycle.payoutEndedAt && cycle.payoutEndedAt < now)
    currentPhase = CyclePhase.Completed;

  return currentPhase;
};
