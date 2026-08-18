import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { getDateRangeFilter } from "@/modules/common/utils/getDateRangeFilter";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { HIGH_VOLUME_AUDIT_EVENT_TYPES } from "../utils/AuditEventTypes";
import { SystemLogVolume } from "../utils/systemLogFilterParams";

const AUDIT_EVENTS_PAGE_SIZE = 50;

const isHidingHighVolumeAuditEvents = (
  type: string[] | null | undefined,
  volume: SystemLogVolume,
) => volume === SystemLogVolume.WithoutHighVolume && !(type && type.length > 0);

export const getAuditEvents = cache(
  withTrace(
    "getAuditEvents",
    async (
      type?: string[] | null,
      createdById?: string[] | null,
      cursor?: string | null,
      direction: CursorDirection = CursorDirection.Next,
      volume: SystemLogVolume = SystemLogVolume.WithoutHighVolume,
      from?: string | null,
      to?: string | null,
    ) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("systemLog", "read"))) forbidden();

      const createdAt = getDateRangeFilter(from, to);

      /**
       * An explicit type filter always wins, so picking a high-volume type
       * can never come back empty because of the volume setting.
       */
      const where = {
        ...(type && type.length > 0
          ? { type: { in: type } }
          : isHidingHighVolumeAuditEvents(type, volume)
            ? { type: { notIn: [...HIGH_VOLUME_AUDIT_EVENT_TYPES] } }
            : {}),
        ...(createdById && createdById.length > 0
          ? { createdById: { in: createdById } }
          : {}),
        ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
      };

      const take =
        direction === CursorDirection.Prev
          ? -(AUDIT_EVENTS_PAGE_SIZE + 1)
          : AUDIT_EVENTS_PAGE_SIZE + 1;

      const rows = await prisma.auditEvent.findMany({
        where,
        /**
         * `id` breaks ties so the order is total. Events written in one
         * batch share a `createdAt` down to the millisecond, and the cursor
         * below can only pick a page boundary out of an order that has
         * exactly one — otherwise rows tied with the cursor row get skipped
         * or repeated across pages.
         */
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...(cursor
          ? {
              cursor: {
                id: cursor,
              },
              skip: 1,
            }
          : {}),
        take,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const hasMore = rows.length > AUDIT_EVENTS_PAGE_SIZE;

      let events;
      if (hasMore) {
        if (direction === CursorDirection.Prev) {
          events = rows.slice(1);
        } else {
          events = rows.slice(0, AUDIT_EVENTS_PAGE_SIZE);
        }
      } else {
        events = rows;
      }

      const hasNextPage =
        direction === CursorDirection.Next ? hasMore : !!cursor;
      const hasPrevPage =
        direction === CursorDirection.Prev ? hasMore : !!cursor;

      return {
        events,
        nextCursor:
          hasNextPage && events.length > 0
            ? events[events.length - 1].id
            : null,
        prevCursor: hasPrevPage && events.length > 0 ? events[0].id : null,
      };
    },
  ),
);
