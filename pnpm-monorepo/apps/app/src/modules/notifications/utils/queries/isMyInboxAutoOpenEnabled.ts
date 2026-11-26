import {
  getApplicationContext,
  getOptionalRequestActor,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { isOwnInboxAutoOpenEnabled } from "@sam-monorepo/application";
import { cache } from "react";

export const isMyInboxAutoOpenEnabled = cache(
  withTrace("isMyInboxAutoOpenEnabled", async () => {
    const actor = await getOptionalRequestActor();
    if (!actor) return true;

    return isOwnInboxAutoOpenEnabled(getApplicationContext(), actor);
  }),
);
