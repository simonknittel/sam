// Make sure to mirror this file with app/src/modules/profit-distribution/utils/getTotalSilc.ts

import type { ProfitDistributionCycleParticipant } from "@sam-monorepo/database";

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
