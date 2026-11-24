import {
  getApplicationContext,
  getOptionalRequestActor,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { loadFlowContext, type FlowContext } from "@sam-monorepo/application";
import { cache } from "react";

/** Null without a session or without clearance */
export const getFlowContext = cache(
  withTrace("getFlowContext", async (): Promise<FlowContext | null> => {
    const actor = await getOptionalRequestActor();
    if (!actor) return null;

    return loadFlowContext(getApplicationContext(), actor);
  }),
);
