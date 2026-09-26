import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Prisma } from "@sam-monorepo/database/client";

/**
 * The users an admin can assume. The session is resolved through the
 * Discord account of the user, thus a user without one can't be assumed.
 */
export const ASSUMABLE_USER_WHERE = {
  accounts: {
    some: {},
  },
} satisfies Prisma.UserWhereInput;

/** Leaves out the own account of the admin, which the session ignores */
export const getAssumableUsers = withTrace(
  "getAssumableUsers",
  async (adminId: string) => {
    return prisma.user.findMany({
      where: {
        ...ASSUMABLE_USER_WHERE,
        id: { not: adminId },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  },
);
