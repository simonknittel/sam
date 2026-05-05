import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { type Entity } from "@prisma/client";
import { forbidden } from "next/navigation";
import { cache } from "react";

const PENALTY_ENTRIES_PAGE_SIZE = 50;

const buildExpiredWhereClause = (expired: "active" | "all") => {
  if (expired === "active") {
    const now = new Date();
    return {
      OR: [
        {
          expiresAt: {
            gte: now,
          },
        },
        {
          expiresAt: null,
        },
      ],
    };
  }
  return {};
};

export const getPenaltyEntriesPaginated = cache(
  withTrace(
    "getPenaltyEntriesPaginated",
    async (
      expired: "active" | "all" = "active",
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
        where: {
          deletedAt: null,
          ...buildExpiredWhereClause(expired),
        },
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

export const getEntriesOfCitizen = withTrace(
  "getEntriesOfCitizen",
  async (citizenId: Entity["id"], expired: "active" | "all" = "active") => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) throw new Error("Forbidden");
    if (
      !(await authentication.authorize("penaltyEntry", "read")) &&
      !(
        citizenId === authentication.session.entity.id &&
        (await authentication.authorize("ownPenaltyEntry", "read"))
      )
    )
      throw new Error("Forbidden");

    return prisma.penaltyEntry.findMany({
      where: {
        citizenId,
        deletedAt: null,
        ...buildExpiredWhereClause(expired),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        citizen: true,
        createdBy: true,
      },
    });
  },
);

export const getPenaltyEntriesOfCurrentUser = cache(
  withTrace("getPenaltyEntriesOfCurrentUser", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) throw new Error("Forbidden");
    if (!(await authentication.authorize("ownPenaltyEntry", "read")))
      throw new Error("Forbidden");

    const now = new Date();

    return prisma.penaltyEntry.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            expiresAt: {
              gte: now,
            },
          },
          {
            expiresAt: null,
          },
        ],
        citizenId: authentication.session.entity.id,
      },
    });
  }),
);
