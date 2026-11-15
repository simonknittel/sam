import { getApplicationContext, getRequestActor } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { listOwnWebPushSubscriptions } from "@sam-monorepo/application";
import { cache } from "react";

export const getMyWebPushSubscriptions = cache(
  withTrace("getMyWebPushSubscriptions", async () =>
    listOwnWebPushSubscriptions(
      getApplicationContext(),
      await getRequestActor(),
    ),
  ),
);
