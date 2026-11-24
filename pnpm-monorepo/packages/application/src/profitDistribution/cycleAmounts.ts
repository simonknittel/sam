import type { ProfitDistributionCycleParticipant } from "@sam-monorepo/database/client";

const sumAuec = (
  participants: readonly Pick<
    ProfitDistributionCycleParticipant,
    "silcBalanceSnapshot"
  >[],
  auecPerSilc: number,
) =>
  participants.reduce(
    (total, participant) =>
      total + (participant.silcBalanceSnapshot ?? 0) * auecPerSilc,
    0,
  );

export const getOpenAuecPayout = (
  participants: readonly Pick<
    ProfitDistributionCycleParticipant,
    "silcBalanceSnapshot" | "cededAt" | "disbursedAt"
  >[],
  auecPerSilc: number,
) =>
  sumAuec(
    participants.filter(
      (participant) => !participant.disbursedAt && !participant.cededAt,
    ),
    auecPerSilc,
  );

export const getPaidAuec = (
  participants: readonly Pick<
    ProfitDistributionCycleParticipant,
    "silcBalanceSnapshot" | "disbursedAt"
  >[],
  auecPerSilc: number,
) =>
  sumAuec(
    participants.filter((participant) => participant.disbursedAt),
    auecPerSilc,
  );
