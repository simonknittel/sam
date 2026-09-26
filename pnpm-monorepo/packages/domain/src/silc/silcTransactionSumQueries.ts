import type { Prisma } from "@sam-monorepo/database/client";

const createSumQuery = (
  citizenIds: string[],
  value: Prisma.IntFilter<"SilcTransaction">,
) =>
  ({
    by: ["receiverId"],
    where: {
      deletedAt: null,
      receiverId: { in: citizenIds },
      value,
    },
    _sum: { value: true },
  }) satisfies Prisma.SilcTransactionGroupByArgs;

/**
 * Arguments of the two `groupBy` queries of the app and the Lambda, which
 * differ only in their tracing wrappers.
 *
 * The queries sum the non-deleted transactions of each citizen in the
 * database, separately for the positive values and for the other values.
 * `calculateSilcBalances()` adds each value to the balance, and only a
 * positive value to the lifetime earnings. A sum of positive values is
 * positive and a sum of the other values is not, thus the sums give the same
 * balances as the single transactions. The result has at most two rows per
 * citizen, while the transaction table grows forever.
 */
export const getSilcTransactionSumQueries = (citizenIds: string[]) =>
  [
    createSumQuery(citizenIds, { gt: 0 }),
    createSumQuery(citizenIds, { lte: 0 }),
  ] as const;

/** Converts the results of the queries into the input of `calculateSilcBalances()` */
export const toSilcTransactionSums = (
  results: readonly (readonly {
    receiverId: string;
    _sum: { value: number | null };
  }[])[],
) =>
  results.flat().map(({ receiverId, _sum }) => ({
    receiverId,
    value: _sum.value ?? 0,
  }));
