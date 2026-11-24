import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findEventApplicationRows,
  type EventDetails,
} from "@sam-monorepo/application";
import { cache } from "react";

export const getEventApplications = cache(
  withTrace("getEventApplications", async (event: Pick<EventDetails, "id">) => {
    try {
      return await findEventApplicationRows(
        getApplicationContext(),
        await getRequestActor(),
        { eventId: event.id },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
