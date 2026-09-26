import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Prisma } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";
import { UserBanStatus, UserSort } from "../utils/userListSearchParams";

const USERS_PAGE_SIZE = 50;

/** Longer than any handle; the search comes from the URL */
const MAX_HANDLE_QUERY_LENGTH = 100;

/** The largest offset that the database accepts (32-bit integer) */
const MAX_OFFSET = 2_147_483_647;

const getOrderBy = (sort: UserSort): Prisma.UserOrderByWithRelationInput[] => {
  switch (sort) {
    case UserSort.CreatedAtDesc:
      return [{ createdAt: { sort: "desc", nulls: "last" } }, { id: "desc" }];

    case UserSort.CreatedAtAsc:
      return [{ createdAt: { sort: "asc", nulls: "last" } }, { id: "asc" }];

    case UserSort.EmailVerifiedDesc:
      return [
        { emailVerified: { sort: "desc", nulls: "last" } },
        { id: "desc" },
      ];

    case UserSort.EmailVerifiedAsc:
      return [{ emailVerified: { sort: "asc", nulls: "last" } }, { id: "asc" }];

    case UserSort.NameAsc:
      return [{ name: { sort: "asc", nulls: "last" } }, { id: "asc" }];

    case UserSort.NameDesc:
      return [{ name: { sort: "desc", nulls: "last" } }, { id: "desc" }];

    default:
      throw new Error(`Unknown sort: ${sort satisfies never}`);
  }
};

const getBanStatusWhere = (banStatus: UserBanStatus): Prisma.UserWhereInput => {
  switch (banStatus) {
    case UserBanStatus.All:
      return {};

    case UserBanStatus.Banned:
      return { bannedAt: { not: null } };

    case UserBanStatus.Active:
      return { bannedAt: null };

    default:
      throw new Error(`Unknown ban status: ${banStatus satisfies never}`);
  }
};

/**
 * The handle belongs to the entity with the Discord ID of the user's
 * account. The two models have no relation, thus the search resolves the
 * Discord IDs of the matching entities first.
 */
const getHandleWhere = async (
  handleQuery: string,
): Promise<Prisma.UserWhereInput> => {
  const entities = await prisma.entity.findMany({
    where: {
      handle: { contains: handleQuery, mode: "insensitive" },
      discordId: { not: null },
    },
    select: {
      discordId: true,
    },
  });

  return {
    accounts: {
      some: {
        providerAccountId: {
          in: entities.flatMap(({ discordId }) =>
            discordId ? [discordId] : [],
          ),
        },
      },
    },
  };
};

/**
 * The cursor of the user list is the offset of the first row of the page.
 * Unlike a keyset cursor, an offset works with each sort order without
 * additional conditions for the null values of the nullable sort columns.
 * The list is small, thus the database skips the rows before the offset
 * quickly. Cursors come from the URL, thus a malformed one gives the first
 * page.
 */
const parseOffset = (cursor: string | null) => {
  const offset = Number(cursor);
  return Number.isSafeInteger(offset) && offset > 0 && offset <= MAX_OFFSET
    ? offset
    : 0;
};

interface Options {
  readonly sort: UserSort;
  readonly banStatus: UserBanStatus;
  readonly handleQuery: string | null;
  readonly cursor: string | null;
}

export const getUsersWithEntities = withTrace(
  "getUsersWithEntities",
  async ({ sort, banStatus, handleQuery, cursor }: Options) => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("user", "read"))) forbidden();

    const offset = parseOffset(cursor);

    const rows = await prisma.user.findMany({
      where: {
        ...getBanStatusWhere(banStatus),
        ...(handleQuery
          ? await getHandleWhere(handleQuery.slice(0, MAX_HANDLE_QUERY_LENGTH))
          : {}),
      },
      orderBy: getOrderBy(sort),
      skip: offset,
      take: USERS_PAGE_SIZE + 1,
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        emailVerified: true,
        bannedAt: true,
        bannedReason: true,
        role: true,
        bannedBy: {
          select: {
            id: true,
            handle: true,
          },
        },
        accounts: {
          select: {
            providerAccountId: true,
          },
          take: 1,
        },
      },
    });

    const hasNextPage = rows.length > USERS_PAGE_SIZE;
    const pageRows = rows.slice(0, USERS_PAGE_SIZE);

    /** Matched to a user by Discord ID; the table links by citizen ID */
    const entities = await prisma.entity.findMany({
      where: {
        discordId: {
          in: pageRows.flatMap(({ accounts }) =>
            accounts.map(({ providerAccountId }) => providerAccountId),
          ),
        },
      },
      select: {
        id: true,
        handle: true,
        discordId: true,
      },
    });
    const entityByDiscordId = new Map(
      entities.map((entity) => [entity.discordId, entity]),
    );

    const users = pageRows.map(({ accounts, ...user }) => {
      const discordId = accounts[0]?.providerAccountId ?? null;

      return {
        user,
        discordId,
        entity: discordId ? entityByDiscordId.get(discordId) : undefined,
      };
    });

    return {
      users,
      nextCursor: hasNextPage ? String(offset + USERS_PAGE_SIZE) : null,
      prevCursor:
        offset > 0 ? String(Math.max(0, offset - USERS_PAGE_SIZE)) : null,
    };
  },
);
