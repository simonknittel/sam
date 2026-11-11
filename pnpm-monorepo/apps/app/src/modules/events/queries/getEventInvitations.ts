import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findEventInvitationRows,
  type EventDetails,
} from "@sam-monorepo/application";
import { cache } from "react";

/** See `findEventInvitationRows()` */
export const getEventInvitations = cache(
  withTrace("getEventInvitations", async (event: Pick<EventDetails, "id">) => {
    try {
      return await findEventInvitationRows(
        getApplicationContext(),
        await getRequestActor(),
        { eventId: event.id },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
