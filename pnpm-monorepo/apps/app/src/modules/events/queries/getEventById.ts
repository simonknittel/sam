import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findVisibleEvent,
  NotFoundError,
  type EventDetails,
} from "@sam-monorepo/application";
import { cache } from "react";

/**
 * One event with everything its layout and its subpages share. The position
 * tree is deliberately not part of it: only the lineup page renders it, and
 * this query sits behind the layout of all seven subpages — see
 * `getEventPositions()`.
 *
 * Not visible is indistinguishable from nonexistent: callers translate the
 * null into a 404.
 */
export const getEventById = cache(
  withTrace("getEventById", async (id: EventDetails["id"]) => {
    try {
      return await findVisibleEvent(
        getApplicationContext(),
        await getRequestActor(),
        id,
      );
    } catch (error) {
      if (error instanceof NotFoundError) return null;

      return throwApplicationErrorForPage(error);
    }
  }),
);
