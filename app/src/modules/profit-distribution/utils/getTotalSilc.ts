// Make sure to mirror this file with pnpm-monorepo/apps/lambda/src/functions/notification-router/utils/getTotalSilc.ts

import type { ProfitDistributionCycleParticipant } from "@/generated/prisma/client";

export const getTotalSilc = (
  participants: Pick<
    ProfitDistributionCycleParticipant,
    "silcBalanceSnapshot" | "cededAt"
  >[],
) => {
  return participants
    .filter(
      (participant) => participant.silcBalanceSnapshot && !participant.cededAt,
    )
    .reduce(
      (total, participant) => total + participant.silcBalanceSnapshot!,
      0,
    );
};
