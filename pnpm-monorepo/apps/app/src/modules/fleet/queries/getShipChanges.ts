import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Prisma } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";
import { cache } from "react";

const SHIP_CHANGES_PAGE_SIZE = 100;

/** What one row of the changes table renders */
const CHANGED_SHIP_SELECT = {
  id: true,
  name: true,
  createdAt: true,
  createdById: true,
  deletedAt: true,
  deletedById: true,
  variant: {
    select: {
      id: true,
      name: true,
      status: true,
      series: {
        select: {
          manufacturer: {
            select: {
              name: true,
              image: { select: { id: true, mimeType: true } },
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.ShipSelect;

export interface ShipChangeRow {
  changeDate: Date;
  changeType: "creation" | "deletion";
  ship: Prisma.ShipGetPayload<{ select: typeof CHANGED_SHIP_SELECT }>;
  actorId?: string | null;
  actorHandle?: string | null;
}

export const getShipChanges = cache(
  withTrace(
    "getShipChanges",
    async ({
      changeType = "both",
      cursor,
      direction = CursorDirection.Next,
    }: {
      changeType?: "both" | "creation" | "deletion";
      cursor?: string | null;
      direction?: CursorDirection;
    } = {}) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("otherShips", "read"))) forbidden();

      /**
       * Without a cursor the answer is the newest page of the merged
       * streams, and a row can only reach it by being among the newest
       * page of its own stream — so each query stops there. A cursor page
       * can sit arbitrarily deep in either stream, and the composite
       * cursor (`shipId:changeType`) addresses the merged list rather than
       * one stream, so those still merge the full set in memory.
       */
      const streamTake = cursor ? undefined : SHIP_CHANGES_PAGE_SIZE + 1;

      const [createdShips, deletedShips] = await Promise.all([
        changeType === "deletion"
          ? Promise.resolve([])
          : prisma.ship.findMany({
              where: {
                deletedAt: null,
              },
              /**
               * `Ship.createdAt` is nullable, and Postgres sorts NULLs
               * first in DESC. Those rows carry no change date, so sorting
               * them last keeps them out of every page that has real
               * changes to show.
               */
              orderBy: {
                createdAt: { sort: "desc", nulls: "last" },
              },
              take: streamTake,
              select: {
                ...CHANGED_SHIP_SELECT,
                createdBy: {
                  select: {
                    handle: true,
                  },
                },
              },
            }),
        changeType === "creation"
          ? Promise.resolve([])
          : prisma.ship.findMany({
              where: {
                deletedAt: { not: null },
              },
              orderBy: {
                deletedAt: "desc",
              },
              take: streamTake,
              select: {
                ...CHANGED_SHIP_SELECT,
                deletedBy: {
                  select: {
                    handle: true,
                  },
                },
              },
            }),
      ]);

      const changes: ShipChangeRow[] = [
        ...createdShips.map((ship) => ({
          changeDate: ship.createdAt!,
          changeType: "creation" as const,
          ship,
          actorId: ship.createdById,
          actorHandle: ship.createdBy?.handle,
        })),
        ...deletedShips.map((ship) => ({
          changeDate: ship.deletedAt!,
          changeType: "deletion" as const,
          ship,
          actorId: ship.deletedById,
          actorHandle: ship.deletedBy?.handle,
        })),
      ];

      const sorted = changes.toSorted(
        (a, b) => b.changeDate.getTime() - a.changeDate.getTime(),
      );

      const cursorKey = (c: ShipChangeRow) => `${c.ship.id}:${c.changeType}`;

      const cursorIndex = cursor
        ? sorted.findIndex((c) => cursorKey(c) === cursor)
        : -1;

      let pageItems: ShipChangeRow[];

      if (!cursor) {
        pageItems = sorted.slice(0, SHIP_CHANGES_PAGE_SIZE + 1);
      } else if (direction === CursorDirection.Next) {
        const fromIndex = cursorIndex !== -1 ? cursorIndex + 1 : 0;
        pageItems = sorted.slice(
          fromIndex,
          fromIndex + SHIP_CHANGES_PAGE_SIZE + 1,
        );
      } else {
        const toIndex = cursorIndex !== -1 ? cursorIndex : sorted.length;
        const fromIndex = Math.max(0, toIndex - SHIP_CHANGES_PAGE_SIZE - 1);
        pageItems = sorted.slice(fromIndex, toIndex);
      }

      const hasMore = pageItems.length > SHIP_CHANGES_PAGE_SIZE;

      let items: ShipChangeRow[];
      if (hasMore) {
        items =
          direction === CursorDirection.Next
            ? pageItems.slice(0, SHIP_CHANGES_PAGE_SIZE)
            : pageItems.slice(1);
      } else {
        items = pageItems;
      }

      const hasNextPage =
        direction === CursorDirection.Next ? hasMore : !!cursor;
      const hasPrevPage =
        direction === CursorDirection.Prev ? hasMore : !!cursor;

      return {
        changes: items,
        nextCursor:
          hasNextPage && items.length > 0
            ? cursorKey(items[items.length - 1])
            : null,
        prevCursor:
          hasPrevPage && items.length > 0 ? cursorKey(items[0]) : null,
      };
    },
  ),
);
