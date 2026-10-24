import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { getDateRangeFilter } from "@/modules/common/utils/getDateRangeFilter";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  listManualNotifications,
  UnknownCursorBehavior,
} from "@sam-monorepo/application";
import { cache } from "react";

const MANUAL_NOTIFICATIONS_PAGE_SIZE = 50;

export const getManualNotifications = cache(
  withTrace(
    "getManualNotifications",
    async (
      search?: string | null,
      cursor?: string | null,
      direction: CursorDirection = CursorDirection.Next,
      from?: string | null,
      to?: string | null,
    ) => {
      const { gte, lt } = getDateRangeFilter(from, to);

      try {
        const page = await listManualNotifications(
          getApplicationContext(),
          await getRequestActor(),
          {
            search: search || undefined,
            from: gte,
            to: lt,
            limit: MANUAL_NOTIFICATIONS_PAGE_SIZE,
            cursor: cursor ?? undefined,
          },
          { direction, unknownCursor: UnknownCursorBehavior.FirstPage },
        );

        return {
          notifications: page.notifications,
          nextCursor: page.next_cursor,
          prevCursor: page.previous_cursor,
        };
      } catch (error) {
        return throwApplicationErrorForPage(error);
      }
    },
  ),
);
