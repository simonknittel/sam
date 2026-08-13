import type { SilcTransaction } from "@sam-monorepo/database/client";

interface SilcBalance {
  balance: number;
  totalEarned: number;
}

/**
 * Replays all SILC transactions into the current balance and lifetime
 * earnings of each given citizen. Transactions of other citizens are
 * ignored; citizens without transactions end up at zero.
 */
export const calculateSilcBalances = (
  citizenIds: string[],
  transactions: Pick<SilcTransaction, "receiverId" | "value">[],
): Map<string, SilcBalance> => {
  const silcBalancePerCitizen = new Map<string, SilcBalance>(
    citizenIds.map((citizenId) => [citizenId, { balance: 0, totalEarned: 0 }]),
  );

  for (const transaction of transactions) {
    const { receiverId, value } = transaction;

    const entry = silcBalancePerCitizen.get(receiverId);
    if (!entry) continue;

    silcBalancePerCitizen.set(receiverId, {
      balance: entry.balance + value,
      totalEarned: value > 0 ? entry.totalEarned + value : entry.totalEarned,
    });
  }

  return silcBalancePerCitizen;
};
