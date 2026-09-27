import { prisma, type Citizen } from "@sam-monorepo/database";
import {
  calculateSilcBalances,
  getSilcTransactionSumQueries,
  toSilcTransactionSums,
} from "@sam-monorepo/domain";
import { captureAsyncFunc } from "../common/xray";

const getSilcTransactionSumsWithoutAuthorization = async (
  citizenIds: Citizen["id"][],
) => {
  return captureAsyncFunc(
    "getSilcTransactionSumsWithoutAuthorization",
    async () => {
      const [positiveQuery, otherQuery] =
        getSilcTransactionSumQueries(citizenIds);

      return toSilcTransactionSums(
        await Promise.all([
          prisma.silcTransaction.groupBy(positiveQuery),
          prisma.silcTransaction.groupBy(otherQuery),
        ]),
      );
    },
  );
};

export const updateCitizensSilcBalances = async (
  citizenIds: Citizen["id"][],
) => {
  return captureAsyncFunc("updateCitizensSilcBalances", async () => {
    if (citizenIds.length <= 0) return;

    const transactionSums =
      await getSilcTransactionSumsWithoutAuthorization(citizenIds);

    const silcBalancePerCitizen = calculateSilcBalances(
      citizenIds,
      transactionSums,
    );

    for (const [
      receiverId,
      { balance, totalEarned },
    ] of silcBalancePerCitizen) {
      await prisma.citizen.update({
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
