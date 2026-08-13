import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Shared argument object of the app's and the lambda's
 * `getSilcTransactionsOfAllCitizensWithoutAuthorization` queries — the two
 * implementations differ only in their caching/tracing wrappers.
 */
export const SILC_TRANSACTIONS_OF_ALL_CITIZENS_QUERY = {
  where: {
    deletedAt: null,
  },
  orderBy: {
    createdAt: "asc",
  },
  include: {
    receiver: {
      select: {
        id: true,
        handle: true,
      },
    },
    createdBy: {
      select: {
        id: true,
        handle: true,
      },
    },
    updatedBy: {
      select: {
        id: true,
        handle: true,
      },
    },
  },
} as const satisfies Prisma.SilcTransactionFindManyArgs;
