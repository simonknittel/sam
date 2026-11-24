import { getApplicationContext, getRequestActor } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  canReadEventBriefing as canActorReadEventBriefing,
  type EventBriefingGateEvent,
} from "@sam-monorepo/application";

/** The callers must check `event;read` first, like each list of events */
export const canReadEventBriefing = withTrace(
  "canReadEventBriefing",
  async (event: EventBriefingGateEvent) =>
    canActorReadEventBriefing(
      getApplicationContext(),
      await getRequestActor(),
      event,
    ),
);
