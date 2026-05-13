import type { ProfitDistributionCycleParticipant } from "@/generated/prisma/client";

export const getOpenAuecPayout = (
  participants: ProfitDistributionCycleParticipant[],
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
