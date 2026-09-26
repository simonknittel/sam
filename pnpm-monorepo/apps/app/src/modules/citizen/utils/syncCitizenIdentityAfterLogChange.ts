import { prisma } from "@/db";
import type { EntityLog } from "@sam-monorepo/database/client";
import { updateEntityCaches } from "./updateEntityCaches";

/**
 * Updates all data that depends on the confirmed identity logs of a citizen,
 * after a user confirms or deletes one of these logs: the display name of
 * the linked user account and the cached attribute columns of the entity.
 */
export const syncCitizenIdentityAfterLogChange = async (
  log: Pick<EntityLog, "entityId" | "type">,
) => {
  if (["handle", "discord-id"].includes(log.type)) {
    const entityLogs = await prisma.entityLog.findMany({
      where: {
        entityId: log.entityId,
        type: {
          in: ["discord-id", "handle"],
        },
        attributes: {
          some: {
            key: "confirmed",
            value: "confirmed",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        type: true,
        content: true,
      },
    });

    const latestConfirmedHandleLog = entityLogs.find(
      (entityLog) => entityLog.type === "handle",
    );
    const latestConfirmedDiscordIdLog = entityLogs.find(
      (entityLog) => entityLog.type === "discord-id",
    );

    if (latestConfirmedDiscordIdLog) {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "discord",
            providerAccountId: latestConfirmedDiscordIdLog.content!,
          },
        },
        select: {
          userId: true,
        },
      });

      if (account) {
        await prisma.user.update({
          where: {
            id: account.userId,
          },
          data: {
            name: latestConfirmedHandleLog?.content || log.entityId,
          },
          select: {
            id: true,
          },
        });
      }
    }
  }

  await updateEntityCaches(log);
};
