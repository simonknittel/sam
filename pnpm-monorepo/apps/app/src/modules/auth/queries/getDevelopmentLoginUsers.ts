import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { ASSUMABLE_USER_WHERE } from "@/modules/users/queries/getAssumableUsers";
import type { Prisma } from "@sam-monorepo/database/client";

/**
 * A local database has only a few admins. The limit only keeps the list
 * short on a mirrored production database.
 */
const MAX_DEVELOPMENT_LOGIN_USERS = 50;

/**
 * The users that the development login accepts: admins that a session can
 * be resolved for, the same rule as for assuming a user. To test as a
 * different user, sign in as an admin and assume that user.
 */
export const DEVELOPMENT_LOGIN_USER_WHERE = {
  ...ASSUMABLE_USER_WHERE,
  role: "admin",
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
