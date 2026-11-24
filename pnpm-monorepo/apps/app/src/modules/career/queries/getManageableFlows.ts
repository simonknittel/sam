import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findManageableFlow,
  findManageableFlows,
  type FlowStatus,
} from "@sam-monorepo/application";
import { cache } from "react";

export const getManageableFlows = cache(
  withTrace(
    "getManageableFlows",
    async (status: FlowStatus, query: string | null) => {
      try {
        return await findManageableFlows(
          getApplicationContext(),
          await getRequestActor(),
          { status, query },
        );
      } catch (error) {
        return throwApplicationErrorForPage(error);
      }
    },
  ),
);

export const getManageableFlow = cache(
  withTrace("getManageableFlow", async (flowId: string) => {
    try {
      return await findManageableFlow(
        getApplicationContext(),
        await getRequestActor(),
        { flowId },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
