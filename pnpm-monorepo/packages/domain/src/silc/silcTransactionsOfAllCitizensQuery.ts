import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Shared argument object of the app's and the lambda's
 * `getSilcTransactionsOfAllCitizensWithoutAuthorization` queries — the two
 * implementations differ only in their caching/tracing wrappers.
 *
 * Both feed `calculateSilcBalances()` and nothing else, so the query selects
 * the two columns it consumes. This matters because it reads the entire
 * non-deleted transaction table, which grows forever, on every SILC mutation
 * and every night in the Lambda.
 *
 * Replaying the balances is a plain sum per receiver and therefore
 * order-independent, so the query needs no `orderBy` either.
 */
export const SILC_TRANSACTIONS_OF_ALL_CITIZENS_QUERY = {
  where: {
    deletedAt: null,
  },
  select: {
    receiverId: true,
    value: true,
  },
} as const satisfies Prisma.SilcTransactionFindManyArgs;
