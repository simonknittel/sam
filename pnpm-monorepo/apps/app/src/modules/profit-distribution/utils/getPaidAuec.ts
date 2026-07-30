import type { ProfitDistributionCycleParticipant } from "@sam-monorepo/database/client";

export const getPaidAuec = (
  participants: ProfitDistributionCycleParticipant[],
  auecPerSilc: number,
) => {
  return participants
    .filter(
      (participant) =>
        participant.disbursedAt && participant.silcBalanceSnapshot,
    )
    .reduce(
      (total, participant) =>
        total + participant.silcBalanceSnapshot! * auecPerSilc,
      0,
    );
};
