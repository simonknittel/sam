import type { ProfitDistributionCycleParticipant } from "@sam-monorepo/database/client";

export const getPaidAuec = (
  participants: readonly Pick<
    ProfitDistributionCycleParticipant,
    "silcBalanceSnapshot" | "disbursedAt"
  >[],
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
