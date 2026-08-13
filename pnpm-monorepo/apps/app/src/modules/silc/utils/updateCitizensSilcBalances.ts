import { prisma } from "@/db";
import type { Entity } from "@sam-monorepo/database/client";
import { calculateSilcBalances } from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import { getSilcTransactionsOfAllCitizensWithoutAuthorization } from "../queries/getSilcTransactionsOfAllCitizensWithoutAuthorization";

export const updateCitizensSilcBalances = async (
  citizenIds: Entity["id"][],
) => {
  const transactions =
    await getSilcTransactionsOfAllCitizensWithoutAuthorization();

  const silcBalancePerCitizen = calculateSilcBalances(citizenIds, transactions);

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
