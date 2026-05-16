import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

const BLUEPRINTS_PAGE_SIZE = 100;

type BlueprintsSort = "name-asc" | "name-desc" | "count-asc" | "count-desc";

export interface BlueprintRow {
  id: string;
  originalKey: string;
  itemName: string;
  itemDescription: string | null;
  unlockCount: number;
  isUnlocked: boolean;
}

export const getBlueprints = cache(
  withTrace(
    "getBlueprints",
    async ({
      gameVersionId,
      unlockStatus = "all",
      sort = "count-desc",
      cursor,
      direction = "next",
    }: {
      gameVersionId: string;
      unlockStatus?: "all" | "unlocked" | "not_unlocked";
      sort?: BlueprintsSort;
      cursor?: string | null;
      direction?: "next" | "prev";
    }) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("blueprint", "read"))) forbidden();

      const citizenId = authentication.session.entity?.id;

      const blueprints = await prisma.blueprint.findMany({
        where: {
          item: {
            gameVersionId,
            name: {
              not: null,
            },
          },
          ...(unlockStatus === "unlocked" && citizenId
            ? { unlocks: { some: { citizenId } } }
            : {}),
          ...(unlockStatus === "not_unlocked" && citizenId
            ? { unlocks: { none: { citizenId } } }
            : {}),
        },
        include: {
          item: {
            select: {
              name: true,
              description: true,
            },
          },
          unlocks: {
            select: {
              citizenId: true,
            },
          },
        },
      });

      const rows: BlueprintRow[] = blueprints.map((blueprint) => ({
        id: blueprint.id,
        originalKey: blueprint.originalKey,
        itemName: blueprint.item.name!,
        itemDescription: blueprint.item.description,
        unlockCount: blueprint.unlocks.length,
        isUnlocked: citizenId
          ? blueprint.unlocks.some((u) => u.citizenId === citizenId)
          : false,
      }));

      const [sortField, sortDirection] = sort.split("-") as [
        "name" | "count",
        "asc" | "desc",
      ];

      const sortedRows = rows.toSorted((a, b) => {
        const sortFn =
          sortDirection === "asc"
            ? sortAscWithAndNullLast
            : sortDescAndNullLast;

        if (sortField === "name") {
          return sortFn(a.itemName, b.itemName);
        }

        return sortFn(a.unlockCount, b.unlockCount);
      });

      let pageItems: BlueprintRow[];

      if (!cursor) {
        pageItems = sortedRows.slice(0, BLUEPRINTS_PAGE_SIZE + 1);
      } else if (direction === "next") {
        const cursorIndex = sortedRows.findIndex((item) => item.id === cursor);
        const fromIndex = cursorIndex !== -1 ? cursorIndex + 1 : 0;
        pageItems = sortedRows.slice(
          fromIndex,
          fromIndex + BLUEPRINTS_PAGE_SIZE + 1,
        );
      } else {
        const cursorIndex = sortedRows.findIndex((item) => item.id === cursor);
        const toIndex = cursorIndex !== -1 ? cursorIndex : sortedRows.length;
        const fromIndex = Math.max(0, toIndex - BLUEPRINTS_PAGE_SIZE - 1);
        pageItems = sortedRows.slice(fromIndex, toIndex);
      }

      const hasMore = pageItems.length > BLUEPRINTS_PAGE_SIZE;

      let blueprintsPage: BlueprintRow[];
      if (hasMore) {
        blueprintsPage =
          direction === "next"
            ? pageItems.slice(0, BLUEPRINTS_PAGE_SIZE)
            : pageItems.slice(1);
      } else {
        blueprintsPage = pageItems;
      }

      const hasNextPage = direction === "next" ? hasMore : !!cursor;
      const hasPrevPage = direction === "prev" ? hasMore : !!cursor;

      return {
        blueprints: blueprintsPage,
        nextCursor:
          hasNextPage && blueprintsPage.length > 0
            ? blueprintsPage[blueprintsPage.length - 1].id
            : null,
        prevCursor:
          hasPrevPage && blueprintsPage.length > 0
            ? blueprintsPage[0].id
            : null,
      };
    },
  ),
);
