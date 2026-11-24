import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Only users that can sign in. The session itself does not need the account.
 */
export const ASSUMABLE_USER_WHERE = {
  accounts: {
    some: {},
  },
} satisfies Prisma.UserWhereInput;
