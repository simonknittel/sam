import { prisma } from "@/db";
import type { EntityLog } from "@sam-monorepo/database/client";
import { updateAlgoliaWithGenericLogType } from "./updateAlgoliaWithGenericLogType";
import { updateEntityCaches } from "./updateEntityCaches";

/**
 * Re-derives everything that depends on a citizen's confirmed identity
 * logs after one of them was confirmed or deleted: the display name of the
 * linked user account, the entity's cached attribute columns and the
 * Algolia search records.
 */
export const syncCitizenIdentityAfterLogChange = async (log: EntityLog) => {
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
      });

      if (account) {
        await prisma.user.update({
          where: {
            id: account.userId,
          },
          data: {
            name: latestConfirmedHandleLog?.content || log.entityId,
          },
        });
      }
    }
  }

  await updateEntityCaches(log);

  switch (log.type) {
    case "handle":
      await updateAlgoliaWithGenericLogType(log, "handles");
      break;
    case "citizen-id":
      await updateAlgoliaWithGenericLogType(log, "citizenIds");
      break;
    case "community-moniker":
      await updateAlgoliaWithGenericLogType(log, "communityMonikers");
      break;

    default:
      break;
  }
};
