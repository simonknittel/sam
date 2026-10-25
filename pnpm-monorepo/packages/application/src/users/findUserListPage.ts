import type { Prisma } from "@sam-monorepo/database/client";
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
 * Longer than any handle. The search comes from the URL, thus the host cuts
 * it to this length.
 */
export const USER_LIST_HANDLE_QUERY_MAXIMUM_LENGTH = 100;

/** The largest offset that the database accepts (32-bit integer) */
const MAXIMUM_OFFSET = 2_147_483_647;

const USER_LIST_SELECT = {
  id: true,
  name: true,
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
  /** At most `USER_LIST_HANDLE_QUERY_MAXIMUM_LENGTH` characters */
  readonly handleQuery: string | null;
  /** The `nextCursor` or the `prevCursor` of a page */
  readonly cursor: string | null;
}

export interface UserListPageOptions {
  /** The number of users on one page */
  readonly pageSize: number;
}

export interface UserListEntry {
  readonly user: Omit<UserListRow, "accounts" | "citizen">;
  readonly discordId: string | null;
  readonly entity: { readonly id: string } | undefined;
}

export interface UserListPage {
  readonly users: UserListEntry[];
  readonly nextCursor: string | null;
  readonly prevCursor: string | null;
}

const getOrderBy = (sort: UserSort): Prisma.UserOrderByWithRelationInput[] => {
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

/** The handle belongs to the citizen of the user */
const getHandleWhere = (handleQuery: string): Prisma.UserWhereInput => ({
  citizen: {
    handle: { contains: handleQuery, mode: "insensitive" },
  },
});

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
  return Number.isSafeInteger(offset) && offset > 0 && offset <= MAXIMUM_OFFSET
    ? offset
    : 0;
};

/**
 * The rows of one page of the user list of the app, with the filters, the
 * order and the offset cursor. Requires `user;read`.
 */
export const findUserListPage = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { sort, banStatus, twoFactorStatus, handleQuery, cursor }: UserListInput,
  { pageSize }: UserListPageOptions,
): Promise<UserListPage> => {
  requirePermission(actor, "user", "read");

  const offset = parseOffset(cursor);

  const rows = await context.prisma.user.findMany({
    where: {
      ...getBanStatusWhere(banStatus),
      ...getTwoFactorStatusWhere(twoFactorStatus),
      ...(handleQuery ? getHandleWhere(handleQuery) : {}),
    },
    orderBy: getOrderBy(sort),
    skip: offset,
    take: pageSize + 1,
    select: USER_LIST_SELECT,
  });

  const hasNextPage = rows.length > pageSize;
  const pageRows = rows.slice(0, pageSize);

  const users = pageRows.map(({ accounts, citizen, ...user }) => ({
    user,
    discordId: accounts[0]?.providerAccountId ?? null,
    entity: citizen ?? undefined,
  }));

  return {
    users,
    nextCursor: hasNextPage ? String(offset + pageSize) : null,
    prevCursor: offset > 0 ? String(Math.max(0, offset - pageSize)) : null,
  };
};
