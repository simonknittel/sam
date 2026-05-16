import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

const EVENTS_PAGE_SIZE = 10;

export const getEvents = cache(
  withTrace(
    "getEvents",
    async (
      status: "open" | "closed" | "all" = "open",
      participating: "me" | "all" = "all",
      cursor?: string | null,
      direction: "next" | "prev" = "next",
    ) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("event", "read"))) forbidden();

      const now = new Date();

      let where: Prisma.EventWhereInput = {};

      if (status === "closed") {
        where = { startTime: { lt: now } };
      } else if (status === "open") {
        where = {
          OR: [{ startTime: { gte: now } }, { endTime: { gte: now } }],
        };
      } else {
        // "all" - no additional filtering needed
        where = {};
      }

      if (participating === "me") {
        where.discordParticipants = {
          some: { discordUserId: authentication.session.discordId },
        };
      }

      const orderDirection: "asc" | "desc" = status === "open" ? "asc" : "desc";
      const orderBy: Prisma.EventOrderByWithRelationInput = {
        startTime: orderDirection,
      };

      // Fetch one extra to detect if there are more pages
      const take =
        direction === "prev" ? -(EVENTS_PAGE_SIZE + 1) : EVENTS_PAGE_SIZE + 1;

      const rows = await prisma.event.findMany({
        where,
        include: {
          discordParticipants: true,
          managers: true,
        },
        orderBy,
        ...(cursor
          ? {
              cursor: {
                id: cursor,
              },
              skip: 1,
            }
          : {}),
        take,
      });

      const hasMore = rows.length > EVENTS_PAGE_SIZE;

      let events;
      if (hasMore) {
        if (direction === "prev") {
          // Extra item is at the beginning
          events = rows.slice(1);
        } else {
          // Extra item is at the end
          events = rows.slice(0, EVENTS_PAGE_SIZE);
        }
      } else {
        events = rows;
      }

      // Next page exists if we fetched forward and got extra, or we came from
      // a backward navigation (meaning there's a page ahead we already visited)
      const hasNextPage = direction === "next" ? hasMore : !!cursor;
      const hasPrevPage = direction === "prev" ? hasMore : !!cursor;

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
