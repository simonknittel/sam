import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { SILC_TRANSACTIONS_OF_ALL_CITIZENS_QUERY } from "@sam-monorepo/domain";
import { cache } from "react";

export const getSilcTransactionsOfAllCitizensWithoutAuthorization = cache(
  withTrace(
    "getSilcTransactionsOfAllCitizensWithoutAuthorization",
    async () => {
      return await prisma.silcTransaction.findMany(
        SILC_TRANSACTIONS_OF_ALL_CITIZENS_QUERY,
      );
    },
  ),
);
