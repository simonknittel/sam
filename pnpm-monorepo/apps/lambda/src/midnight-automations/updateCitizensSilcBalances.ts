import { prisma, type Entity } from "@sam-monorepo/database";
import {
  calculateSilcBalances,
  getSilcTransactionSumQueries,
  toSilcTransactionSums,
} from "@sam-monorepo/domain";
import { captureAsyncFunc } from "../common/xray";

const getSilcTransactionSumsWithoutAuthorization = async (
  citizenIds: Entity["id"][],
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
  citizenIds: Entity["id"][],
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
