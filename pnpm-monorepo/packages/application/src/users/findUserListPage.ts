import type { Prisma } from "@sam-monorepo/database/client";
import { redactEmailAddress } from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";

/** The values are the values of the URL */
export enum UserSort {
  CreatedAtDescending = "createdAt-desc",
  CreatedAtAscending = "createdAt-asc",
  EmailVerifiedDescending = "emailVerified-desc",
  EmailVerifiedAscending = "emailVerified-asc",
  NameAscending = "name-asc",
  NameDescending = "name-desc",
}

export enum UserBanStatus {
  All = "all",
  Banned = "banned",
  Active = "active",
}

/** The two-factor authentication of the last Discord login */
export enum UserTwoFactorStatus {
  All = "all",
  Enabled = "enabled",
  Disabled = "disabled",
  Unknown = "unknown",
}

/**
 * Longer than any handle, Discord ID and TeamSpeak ID. The search comes from
 * the URL, thus the host cuts it to this length.
 */
export const USER_LIST_SEARCH_QUERY_MAXIMUM_LENGTH = 100;

/** The largest offset that the database accepts (32-bit integer) */
const MAXIMUM_OFFSET = 2_147_483_647;

const USER_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  createdAt: true,
  emailVerified: true,
  discordTwoFactorEnabled: true,
  bannedAt: true,
  bannedReason: true,
  role: true,
  bannedBy: {
    select: CITIZEN_REFERENCE_SELECT,
  },
  accounts: {
    select: {
      providerAccountId: true,
    },
    take: 1,
  },
  citizen: {
    select: {
      id: true,
    },
  },
} as const satisfies Prisma.UserSelect;

type UserListRow = Prisma.UserGetPayload<{ select: typeof USER_LIST_SELECT }>;

export interface UserListInput {
  readonly sort: UserSort;
  readonly banStatus: UserBanStatus;
  readonly twoFactorStatus: UserTwoFactorStatus;
  /** At most `USER_LIST_SEARCH_QUERY_MAXIMUM_LENGTH` characters */
  readonly searchQuery: string | null;
  readonly cursor: string | null;
}

export interface UserListPageOptions {
  readonly pageSize: number;
}

export interface UserListEntry {
  readonly user: Omit<UserListRow, "accounts" | "citizen" | "email">;
  readonly redactedEmail: string | null;
  readonly discordId: string | null;
  readonly entity: { readonly id: string } | undefined;
}

export interface UserListPage {
  readonly users: UserListEntry[];
  readonly nextCursor: string | null;
  readonly prevCursor: string | null;
}

export const getUserListOrderBy = (
  sort: UserSort,
): Prisma.UserOrderByWithRelationInput[] => {
  switch (sort) {
    case UserSort.CreatedAtDescending:
      return [{ createdAt: { sort: "desc", nulls: "last" } }, { id: "desc" }];

    case UserSort.CreatedAtAscending:
      return [{ createdAt: { sort: "asc", nulls: "last" } }, { id: "asc" }];

    case UserSort.EmailVerifiedDescending:
      return [
        { emailVerified: { sort: "desc", nulls: "last" } },
        { id: "desc" },
      ];

    case UserSort.EmailVerifiedAscending:
      return [{ emailVerified: { sort: "asc", nulls: "last" } }, { id: "asc" }];

    case UserSort.NameAscending:
      return [{ name: { sort: "asc", nulls: "last" } }, { id: "asc" }];

    case UserSort.NameDescending:
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

const getTwoFactorStatusWhere = (
  twoFactorStatus: UserTwoFactorStatus,
): Prisma.UserWhereInput => {
  switch (twoFactorStatus) {
    case UserTwoFactorStatus.All:
      return {};

    case UserTwoFactorStatus.Enabled:
      return { discordTwoFactorEnabled: true };

    case UserTwoFactorStatus.Disabled:
      return { discordTwoFactorEnabled: false };

    case UserTwoFactorStatus.Unknown:
      return { discordTwoFactorEnabled: null };

    default:
      throw new Error(
        `Unknown two-factor status: ${twoFactorStatus satisfies never}`,
      );
  }
};

/**
 * A search by a TeamSpeak ID would show which citizen has this ID, thus it
 * requires `teamspeak-id;read`
 */
const getSearchWhere = (
  actor: Actor,
  searchQuery: string,
): Prisma.UserWhereInput => {
  const contains = { contains: searchQuery, mode: "insensitive" } as const;

  return {
    OR: [
      { citizen: { handle: contains } },
      {
        accounts: {
          some: { provider: "discord", providerAccountId: contains },
        },
      },
      ...(actor.authorize("teamspeak-id", "read")
        ? [{ citizen: { teamspeakId: contains } }]
        : []),
    ],
  };
};

export const getUserListWhere = (
  actor: Actor,
  {
    banStatus,
    twoFactorStatus,
    searchQuery,
  }: Pick<UserListInput, "banStatus" | "twoFactorStatus" | "searchQuery">,
): Prisma.UserWhereInput => ({
  ...getBanStatusWhere(banStatus),
  ...getTwoFactorStatusWhere(twoFactorStatus),
  ...(searchQuery ? getSearchWhere(actor, searchQuery) : {}),
});

/**
 * The cursor is the offset of the first row of the page. Unlike a keyset
 * cursor, an offset works with each sort order without additional conditions
 * for the null values of the nullable sort columns. The list is small, thus the
 * database skips the rows before the offset quickly.
 *
 * @returns null for a malformed cursor
 */
export const parseUserListOffset = (cursor: string) => {
  const offset = Number(cursor);
  return Number.isSafeInteger(offset) && offset >= 0 && offset <= MAXIMUM_OFFSET
    ? offset
    : null;
};

export const findUserListPage = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { sort, banStatus, twoFactorStatus, searchQuery, cursor }: UserListInput,
  { pageSize }: UserListPageOptions,
): Promise<UserListPage> => {
  requirePermission(actor, "user", "read");

  // Cursors come from the URL, thus a malformed one gives the first page
  const offset = (cursor === null ? null : parseUserListOffset(cursor)) ?? 0;

  const rows = await context.prisma.user.findMany({
    where: getUserListWhere(actor, {
      banStatus,
      twoFactorStatus,
      searchQuery,
    }),
    orderBy: getUserListOrderBy(sort),
    skip: offset,
    take: pageSize + 1,
    select: USER_LIST_SELECT,
  });

  const hasNextPage = rows.length > pageSize;
  const pageRows = rows.slice(0, pageSize);

  const users = pageRows.map(({ accounts, citizen, email, ...user }) => ({
    user,
    redactedEmail: email === null ? null : redactEmailAddress(email),
    discordId: accounts[0]?.providerAccountId ?? null,
    entity: citizen ?? undefined,
  }));

  return {
    users,
    nextCursor: hasNextPage ? String(offset + pageSize) : null,
    prevCursor: offset > 0 ? String(Math.max(0, offset - pageSize)) : null,
  };
};
