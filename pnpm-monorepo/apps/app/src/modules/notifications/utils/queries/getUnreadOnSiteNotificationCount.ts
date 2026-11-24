import {
  getApplicationContext,
  getOptionalRequestActor,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { countOwnUnreadOnSiteNotifications } from "@sam-monorepo/application";
import { cache } from "react";

/**
 * Archiving an unread notification removes it from this count without touching
 * its read state.
 */
export const getUnreadOnSiteNotificationCount = cache(
  withTrace("getUnreadOnSiteNotificationCount", async () => {
    const actor = await getOptionalRequestActor();
    if (!actor) return 0;

    return countOwnUnreadOnSiteNotifications(getApplicationContext(), actor);
  }),
);
