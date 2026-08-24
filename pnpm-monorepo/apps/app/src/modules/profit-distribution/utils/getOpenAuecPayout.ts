import type { ProfitDistributionCycleParticipant } from "@sam-monorepo/database/client";

export const getOpenAuecPayout = (
  participants: readonly Pick<
    ProfitDistributionCycleParticipant,
    "silcBalanceSnapshot" | "cededAt" | "disbursedAt"
  >[],
  auecPerSilc: number,
) => {
  return participants
    .filter(
      (participant) =>
        !participant.disbursedAt &&
        !participant.cededAt &&
        participant.silcBalanceSnapshot,
    )
    .reduce(
      (total, participant) =>
        total + participant.silcBalanceSnapshot! * auecPerSilc,
      0,
    );
};
