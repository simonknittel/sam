import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

const AUDIT_EVENTS_PAGE_SIZE = 30;

export const getAuditEvents = cache(
  withTrace(
    "getAuditEvents",
    async (
      type?: string | null,
      createdById?: string | null,
      cursor?: string | null,
      direction: "next" | "prev" = "next",
    ) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("systemLog", "read"))) forbidden();

      const where = {
        ...(type ? { type } : {}),
        ...(createdById ? { createdById } : {}),
      };

      const take =
        direction === "prev"
          ? -(AUDIT_EVENTS_PAGE_SIZE + 1)
          : AUDIT_EVENTS_PAGE_SIZE + 1;

      const rows = await prisma.auditEvent.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
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
        if (direction === "prev") {
          events = rows.slice(1);
        } else {
          events = rows.slice(0, AUDIT_EVENTS_PAGE_SIZE);
        }
      } else {
        events = rows;
      }

      const hasNextPage = direction === "next" ? hasMore : !!cursor;
      const hasPrevPage = direction === "prev" ? hasMore : !!cursor;

      return {
        events,
        nextCursor:
          hasNextPage && events.length > 0
            ? events[events.length - 1].id
            : null,
        prevCursor:
          hasPrevPage && events.length > 0 ? events[0].id : null,
      };
    },
  ),
);
