import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findEventLineupCitizens } from "@sam-monorepo/application";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";

/**
 * The event's active participants as citizens with their ships of the
 * required variants and their required roles, for the position picker of the
 * lineup
 */
export const getEventCitizens = cache(
  withTrace("getEventCitizens", async (eventId: Event["id"]) => {
    try {
      return await findEventLineupCitizens(
        getApplicationContext(),
        await getRequestActor(),
        { eventId },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
