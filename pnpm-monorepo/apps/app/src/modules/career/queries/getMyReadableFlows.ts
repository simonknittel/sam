import { withTrace } from "@/modules/tracing/utils/withTrace";
import { listReadableFlows } from "@sam-monorepo/application";
import { cache } from "react";
import { getFlowContext } from "./getFlowContext";

export const getMyReadableFlows = cache(
  withTrace("getMyReadableFlows", async () => {
    const context = await getFlowContext();
    if (!context) return [];

    return listReadableFlows(context);
  }),
);

export const hasAnyReadableFlow = cache(async () => {
  const flows = await getMyReadableFlows();
  return flows.length > 0;
});
