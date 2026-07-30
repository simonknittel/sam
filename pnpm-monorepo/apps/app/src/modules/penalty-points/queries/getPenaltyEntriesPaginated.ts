import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

const PENALTY_ENTRIES_PAGE_SIZE = 50;

const buildStatusWhereClause = (status: "active" | "inactive" | "deleted") => {
  const now = new Date();
  if (status === "deleted") {
    return { deletedAt: { not: null } };
  }
  if (status === "active") {
    return {
      deletedAt: null,
      OR: [{ expiresAt: { gte: now } }, { expiresAt: null }],
    };
  }
  return {
    deletedAt: null,
    expiresAt: { lt: now },
  };
};

export const getPenaltyEntriesPaginated = cache(
  withTrace(
    "getPenaltyEntriesPaginated",
    async (
      status: "active" | "inactive" | "deleted" = "active",
      cursor: string | null = null,
      direction: "next" | "prev" = "next",
    ) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("penaltyEntry", "read")))
        forbidden();

      const take =
        direction === "prev"
          ? -(PENALTY_ENTRIES_PAGE_SIZE + 1)
          : PENALTY_ENTRIES_PAGE_SIZE + 1;

      const rows = await prisma.penaltyEntry.findMany({
        where: buildStatusWhereClause(status),
        orderBy: {
          createdAt: "desc",
        },
        include: {
          citizen: true,
          createdBy: true,
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
      });

      const hasMore = rows.length > PENALTY_ENTRIES_PAGE_SIZE;

      let entries;
      if (hasMore) {
        if (direction === "prev") {
          entries = rows.slice(1);
        } else {
          entries = rows.slice(0, PENALTY_ENTRIES_PAGE_SIZE);
        }
      } else {
        entries = rows;
      }

      const hasNextPage = direction === "next" ? hasMore : !!cursor;
      const hasPrevPage = direction === "prev" ? hasMore : !!cursor;

      return {
        entries,
        nextCursor:
          hasNextPage && entries.length > 0
            ? entries[entries.length - 1].id
            : null,
        prevCursor: hasPrevPage && entries.length > 0 ? entries[0].id : null,
      };
    },
  ),
);
