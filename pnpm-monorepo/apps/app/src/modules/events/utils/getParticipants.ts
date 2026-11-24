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

/** For `cache`, see `getEventFleet()` */
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
