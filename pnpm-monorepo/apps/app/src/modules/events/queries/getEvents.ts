import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import {
  EventListStatus,
  EventParticipationFilter,
  EventTypeFilter,
  findEventListPage,
  UnknownCursorBehavior,
} from "@sam-monorepo/application";
import { CursorDirection } from "@sam-monorepo/domain";
import { cache } from "react";

const EVENTS_PAGE_SIZE = 10;

/**
 * One page of the events list. A stale cursor in the URL (its event is gone
 * or not visible anymore) shows the first page, or the last page for the
 * previous direction.
 */
export const getEvents = cache(
  async (
    status: EventListStatus = EventListStatus.Open,
    participating: EventParticipationFilter = EventParticipationFilter.All,
    type: EventTypeFilter = EventTypeFilter.All,
    cursor?: string | null,
    direction: CursorDirection = CursorDirection.Next,
  ) => {
    try {
      return await findEventListPage(
        getApplicationContext(),
        await getRequestActor(),
        {
          status,
          participating,
          type,
          limit: EVENTS_PAGE_SIZE,
          cursor: cursor ?? undefined,
        },
        { direction, unknownCursor: UnknownCursorBehavior.FirstPage },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  },
);
