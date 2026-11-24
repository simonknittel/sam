import { withTrace } from "@/modules/tracing/utils/withTrace";
import { listReadableFlows } from "@sam-monorepo/application";
import { cache } from "react";
import { getFlowContext } from "./getFlowContext";

/**
 * The non-deleted flows the current viewer may read, in display order.
 */
export const getMyReadableFlows = cache(
  withTrace("getMyReadableFlows", async () => {
    const context = await getFlowContext();
    if (!context) return [];

    return listReadableFlows(context);
  }),
);

/**
 * Whether the career app has anything to show the current viewer. Drives the
 * entry points (the command palette and the apps).
 */
export const hasAnyReadableFlow = cache(async () => {
  const flows = await getMyReadableFlows();
  return flows.length > 0;
});
