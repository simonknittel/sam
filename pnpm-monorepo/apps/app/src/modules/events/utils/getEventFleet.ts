import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findEventFleet, type EventDetails } from "@sam-monorepo/application";
import { cache } from "react";

/**
 * See `findEventFleet()`. The pages give the event that `getEventById()`
 * cached, thus `cache` dedupes the calls of one render by its reference.
 */
export const getEventFleet = cache(
  withTrace("getEventFleet", async (event: Pick<EventDetails, "id">) => {
    try {
      return await findEventFleet(
        getApplicationContext(),
        await getRequestActor(),
        { eventId: event.id },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
