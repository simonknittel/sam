import { updateAlgoliaWithGenericLogType } from "@/app/api/spynet/citizen/[id]/log/[logId]/_lib/updateAlgoliaWithGenericLogType";
import { updateEntityCaches } from "@/app/api/spynet/citizen/[id]/log/[logId]/_lib/updateEntityCaches";
import { prisma } from "@/db";
import type { EntityLog, EntityLogAttribute } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import getLatestNoteAttributes from "@/modules/common/utils/getLatestNoteAttributes";

export const confirmLog = async (
  log: EntityLog & {
    attributes: EntityLogAttribute[];
  },
  value: "confirmed" | "false-report",
) => {
  const authentication = await requireAuthentication();

  switch (log.type) {
    case "handle":
    case "teamspeak-id":
      await authentication.authorize(log.type, "confirm");
      break;
    case "discord-id":
    case "citizen-id":
    case "community-moniker":
      await authentication.authorize(log.type, "create");
      break;
    case "note":
      const { noteTypeId, classificationLevelId } =
        getLatestNoteAttributes(log);

      const authorizationAttributes = [];

      if (noteTypeId) {
        authorizationAttributes.push({
          key: "noteTypeId",
          value: noteTypeId.value,
        });
      }

      if (classificationLevelId) {
        authorizationAttributes.push({
          key: "classificationLevelId",
          value: classificationLevelId.value,
        });
      }

      await authentication.authorize(
        "note",
        "confirm",
        // @ts-expect-error The authorization types need to get overhauled
        authorizationAttributes,
      );
      break;

    default:
      throw new Error("Bad request");
  }

  const confirmedAttribute = await prisma.entityLogAttribute.create({
    data: {
      entityLog: {
        connect: {
          id: log.id,
        },
      },
      key: "confirmed",
      value,
      createdBy: {
        connect: {
          id: authentication.session.user.id,
        },
      },
    },
  });

  // Update username
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
      (log) => log.type === "handle",
    );
    const latestConfirmedDiscordIdLog = entityLogs.find(
      (log) => log.type === "discord-id",
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

  /**
   * Update Algolia
   */
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

  return confirmedAttribute;
};
