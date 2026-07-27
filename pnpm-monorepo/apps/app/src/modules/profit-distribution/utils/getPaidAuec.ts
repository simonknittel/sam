import type { ProfitDistributionCycleParticipant } from "@/generated/prisma/client";

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
