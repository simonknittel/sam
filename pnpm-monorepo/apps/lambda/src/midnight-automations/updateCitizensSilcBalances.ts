import { prisma, type Entity } from "@sam-monorepo/database";
import { calculateSilcBalances } from "@sam-monorepo/domain";
import { captureAsyncFunc } from "../common/xray";
import { getSilcTransactionsOfAllCitizensWithoutAuthorization } from "./getSilcTransactionsOfAllCitizensWithoutAuthorization";

export const updateCitizensSilcBalances = async (
  citizenIds: Entity["id"][],
) => {
  return captureAsyncFunc("updateCitizensSilcBalances", async () => {
    if (citizenIds.length <= 0) return;

    const transactions =
      await getSilcTransactionsOfAllCitizensWithoutAuthorization();

    const silcBalancePerCitizen = calculateSilcBalances(
      citizenIds,
      transactions,
    );

    for (const [
      receiverId,
      { balance, totalEarned },
    ] of silcBalancePerCitizen) {
      await prisma.entity.update({
        where: {
          id: receiverId,
        },
        data: {
          silcBalance: balance,
          totalEarnedSilc: totalEarned,
        },
        select: {
          id: true,
        },
      });
    }
  });
};
