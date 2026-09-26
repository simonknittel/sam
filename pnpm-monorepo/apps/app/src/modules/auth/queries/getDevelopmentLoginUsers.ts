import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Prisma } from "@sam-monorepo/database/client";

/**
 * A local database has only a few admins. The limit only keeps the list
 * short on a mirrored production database.
 */
const MAX_DEVELOPMENT_LOGIN_USERS = 50;

/**
 * The users that the development login accepts: admins with a Discord
 * account, because a session cannot be resolved without one. To test as a
 * different user, sign in as an admin and assume that user.
 */
export const DEVELOPMENT_LOGIN_USER_WHERE = {
  role: "admin",
  accounts: {
    some: {},
  },
} satisfies Prisma.UserWhereInput;

export const getDevelopmentLoginUsers = withTrace(
  "getDevelopmentLoginUsers",
  async () => {
    return prisma.user.findMany({
      where: DEVELOPMENT_LOGIN_USER_WHERE,
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
      take: MAX_DEVELOPMENT_LOGIN_USERS,
    });
  },
);
