import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity } from "@sam-monorepo/database/client";
import {
  calculateSilcBalances,
  getSilcTransactionSumQueries,
  toSilcTransactionSums,
} from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";

const getSilcTransactionSumsWithoutAuthorization = withTrace(
  "getSilcTransactionSumsWithoutAuthorization",
  async (citizenIds: Entity["id"][]) => {
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

export const updateCitizensSilcBalances = async (
  citizenIds: Entity["id"][],
) => {
  const transactionSums =
    await getSilcTransactionSumsWithoutAuthorization(citizenIds);

  const silcBalancePerCitizen = calculateSilcBalances(
    citizenIds,
    transactionSums,
  );

  for (const [receiverId, { balance, totalEarned }] of silcBalancePerCitizen) {
    await prisma.entity.update({
      where: {
        id: receiverId,
      },
      data: {
        silcBalance: balance,
        totalEarnedSilc: totalEarned,
      },
    });
  }

  revalidatePath("/app/silc");
  revalidatePath("/app/dashboard");
};
