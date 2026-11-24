import { getApplicationContext, getRequestActor } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findReadableFlowDiagram } from "@sam-monorepo/application";
import { cache } from "react";

export const getFlowWithNodes = cache(
  withTrace("getFlowWithNodes", async (flowId: string) =>
    findReadableFlowDiagram(getApplicationContext(), await getRequestActor(), {
      flowId,
    }),
  ),
);
