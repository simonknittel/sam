import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findResolvedEventParticipants,
  type EventDetails,
} from "@sam-monorepo/application";
import { cache } from "react";

/**
 * See `findResolvedEventParticipants()`. The pages give the event that
 * `getEventById()` cached, thus `cache` dedupes the calls of one render by
 * its reference.
 */
export const getParticipants = cache(
  withTrace("getParticipants", async (event: Pick<EventDetails, "id">) => {
    try {
      return await findResolvedEventParticipants(
        getApplicationContext(),
        await getRequestActor(),
        { eventId: event.id },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
