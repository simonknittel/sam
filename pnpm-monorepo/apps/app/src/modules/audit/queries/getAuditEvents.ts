import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { getDateRangeFilter } from "@/modules/common/utils/getDateRangeFilter";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  AuditEventAccess,
  listAuditEvents,
  UnknownCursorBehavior,
} from "@sam-monorepo/application";
import { cache } from "react";
import {
  SystemLogOrigin,
  SystemLogVolume,
} from "../utils/systemLogFilterParams";

const AUDIT_EVENTS_PAGE_SIZE = 50;

const getTriggeredViaMcp = (origin: SystemLogOrigin) => {
  switch (origin) {
    case SystemLogOrigin.All:
      return undefined;

    case SystemLogOrigin.Mcp:
      return true;

    default:
      throw new Error(`Unknown origin: ${origin satisfies never}`);
  }
};

export const getAuditEvents = cache(
  withTrace(
    "getAuditEvents",
    async (
      type?: string[] | null,
      createdById?: string[] | null,
      cursor?: string | null,
      direction: CursorDirection = CursorDirection.Next,
      volume: SystemLogVolume = SystemLogVolume.WithoutHighVolume,
      origin: SystemLogOrigin = SystemLogOrigin.All,
      access: AuditEventAccess = AuditEventAccess.Write,
      from?: string | null,
      to?: string | null,
    ) => {
      const { gte, lt } = getDateRangeFilter(from, to);

      try {
        const page = await listAuditEvents(
          getApplicationContext(),
          await getRequestActor(),
          {
            types: type ?? undefined,
            created_by_user_ids: createdById ?? undefined,
            from: gte,
            to: lt,
            include_high_volume: volume === SystemLogVolume.All,
            triggered_via_mcp: getTriggeredViaMcp(origin),
            access,
            limit: AUDIT_EVENTS_PAGE_SIZE,
            cursor: cursor ?? undefined,
          },
          { direction, unknownCursor: UnknownCursorBehavior.FirstPage },
        );

        return {
          events: page.events,
          nextCursor: page.next_cursor,
          prevCursor: page.previous_cursor,
        };
      } catch (error) {
        return throwApplicationErrorForPage(error);
      }
    },
  ),
);
