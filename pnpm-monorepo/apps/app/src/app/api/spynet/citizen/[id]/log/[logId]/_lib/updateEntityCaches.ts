import { prisma } from "@/db";
import { type EntityLog } from "@/generated/prisma/client";
import { camelCase } from "change-case";

export const updateEntityCaches = async (entityLog: EntityLog) => {
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
  });

  await prisma.entity.update({
    where: {
      id: entityLog.entityId,
    },
    data: {
      [camelCase(entityLog.type)]: latestConfirmed?.content || null,
    },
  });
};
