import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import {
  findProfitDistributionCycleExcerpts,
  ProfitDistributionCycleListStatus,
} from "@sam-monorepo/application";
import { cache } from "react";

export const getProfitDistributionCycles = cache(async (status = "open") => {
  try {
    return await findProfitDistributionCycleExcerpts(
      getApplicationContext(),
      await getRequestActor(),
      {
        status:
          status === "open"
            ? ProfitDistributionCycleListStatus.Open
            : ProfitDistributionCycleListStatus.Completed,
      },
    );
  } catch (error) {
    return throwApplicationErrorForPage(error);
  }
});
