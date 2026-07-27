import { prisma } from "@/db";
import {
  type Manufacturer,
  type Series,
  type Ship,
  type Upload,
  type Variant,
} from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

const SHIP_CHANGES_PAGE_SIZE = 100;

export interface ShipChangeRow {
  changeDate: Date;
  changeType: "creation" | "deletion";
  ship: Ship & {
    variant: Variant & {
      series: Series & {
        manufacturer: Manufacturer & {
          image: Upload | null;
        };
      };
    };
  };
  actorId?: string | null;
  actorHandle?: string | null;
}

export const getShipChanges = cache(
  withTrace(
    "getShipChanges",
    async ({
      variantIds = [],
      changeType = "both",
      cursor,
      direction = "next",
    }: {
      variantIds?: string[];
      changeType?: "both" | "creation" | "deletion";
      cursor?: string | null;
      direction?: "next" | "prev";
    } = {}) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("otherShips", "read"))) forbidden();

      const baseVariantWhere: Record<string, unknown> = {
        ...(variantIds.length > 0 ? { id: { in: variantIds } } : {}),
      };

      const [createdShips, deletedShips] = await Promise.all([
        changeType === "deletion"
          ? Promise.resolve([])
          : prisma.ship.findMany({
              where: {
                deletedAt: null,
                variant: baseVariantWhere,
              },
              include: {
                variant: {
                  include: {
                    series: {
                      include: {
                        manufacturer: {
                          include: {
                            image: true,
                          },
                        },
                      },
                    },
                  },
                },
                createdBy: {
                  select: {
                    id: true,
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

                variant: baseVariantWhere,
              },
              include: {
                variant: {
                  include: {
                    series: {
                      include: {
                        manufacturer: {
                          include: {
                            image: true,
                          },
                        },
                      },
                    },
                  },
                },
                deletedBy: {
                  select: {
                    id: true,
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
      } else if (direction === "next") {
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
          direction === "next"
            ? pageItems.slice(0, SHIP_CHANGES_PAGE_SIZE)
            : pageItems.slice(1);
      } else {
        items = pageItems;
      }

      const hasNextPage = direction === "next" ? hasMore : !!cursor;
      const hasPrevPage = direction === "prev" ? hasMore : !!cursor;

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
