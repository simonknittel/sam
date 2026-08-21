import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { getFlowContext } from "./getFlowContext";

/**
 * The non-deleted flows the current viewer may read, in display order.
 */
export const getMyReadableFlows = cache(
  withTrace("getMyReadableFlows", async () => {
    const context = await getFlowContext();
    if (!context) return [];

    return context.flows.filter(
      (flow) => context.permissions.get(flow.id)?.canRead,
    );
  }),
);

/**
 * Whether the career app has anything to show the current viewer. Drives the
 * entry points (navigation, command palette, mobile action bar, Apps tile),
 * which used to name the four hardcoded flow ids.
 */
export const hasAnyReadableFlow = cache(async () => {
  const flows = await getMyReadableFlows();
  return flows.length > 0;
});
