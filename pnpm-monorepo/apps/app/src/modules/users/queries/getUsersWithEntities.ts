import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";

export const getUsersWithEntities = withTrace(
  "getUsersWithEntities",
  async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("user", "read"))) forbidden();

    const [users, entities] = await Promise.all([
      prisma.user.findMany({
        include: {
          accounts: true,
        },
      }),

      prisma.entity.findMany(),
    ]);

    const enrichedUsers = users.map((user) => {
      const entity = entities.find(
        (entity) => entity.discordId === user.accounts[0].providerAccountId,
      );

      if (!entity)
        return {
          user,
          discordId: user.accounts[0].providerAccountId,
        };

      return {
        user,
        discordId: user.accounts[0].providerAccountId,
        entity,
      };
    });

    return enrichedUsers;
  },
);
