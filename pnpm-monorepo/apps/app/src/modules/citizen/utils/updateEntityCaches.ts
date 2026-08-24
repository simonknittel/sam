import { prisma } from "@/db";
import { type EntityLog } from "@sam-monorepo/database/client";
import { camelCase } from "change-case";

export const updateEntityCaches = async (
  entityLog: Pick<EntityLog, "entityId" | "type">,
) => {
  if (
    [
      "handle",
      "discord-id",
      "teamspeak-id",
      "spectrum-id",
      "citizen-id",
      "community-moniker",
    ].includes(entityLog.type) === false
  )
    return;

  const latestConfirmed = await prisma.entityLog.findFirst({
    where: {
      entityId: entityLog.entityId,
      type: entityLog.type,
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
      content: true,
    },
  });

  await prisma.entity.update({
    where: {
      id: entityLog.entityId,
    },
    data: {
      [camelCase(entityLog.type)]: latestConfirmed?.content || null,
    },
    select: {
      id: true,
    },
  });
};
