import { prisma } from "@/db";
import { type EntityLog } from "@/generated/prisma/client";
import { updateObject } from "@/modules/algolia";

export async function updateAlgoliaWithGenericLogType(
  log: EntityLog,
  algoliaKey: string,
) {
  const logs = await prisma.entityLog.findMany({
    where: {
      type: log.type,
      entityId: log.entityId,
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

  await updateObject(log.entityId, {
    [algoliaKey]: logs.map((log) => log.content),
  });
}
