import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getSilcTransactionsOfAllCitizensWithoutAuthorization } from "./getSilcTransactionsOfAllCitizensWithoutAuthorization";

export const getSilcTransactionsOfAllCitizens = cache(
  withTrace("getSilcTransactionsOfAllCitizens", async () => {
    const authentication = await requireAuthentication();
    if (
      !(await authentication.authorize("silcTransactionOfOtherCitizen", "read"))
    )
      forbidden();

    return await getSilcTransactionsOfAllCitizensWithoutAuthorization();
  }),
);
