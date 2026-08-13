import { prisma } from "@sam-monorepo/database";
import { SILC_TRANSACTIONS_OF_ALL_CITIZENS_QUERY } from "@sam-monorepo/domain";
import { captureAsyncFunc } from "../common/xray";

export const getSilcTransactionsOfAllCitizensWithoutAuthorization =
  async () => {
    return captureAsyncFunc(
      "getSilcTransactionsOfAllCitizensWithoutAuthorization",
      async () => {
        return await prisma.silcTransaction.findMany(
          SILC_TRANSACTIONS_OF_ALL_CITIZENS_QUERY,
        );
      },
    );
  };
