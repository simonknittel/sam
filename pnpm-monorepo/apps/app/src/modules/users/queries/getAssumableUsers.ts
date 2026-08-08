import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";

/**
 * Users an admin can assume via the AdminEnabler. Only users with a Discord
 * account are included since a session can't be resolved without one.
 */
export const getAssumableUsers = withTrace("getAssumableUsers", async () => {
  return prisma.user.findMany({
    where: {
      accounts: {
        some: {},
      },
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
});
