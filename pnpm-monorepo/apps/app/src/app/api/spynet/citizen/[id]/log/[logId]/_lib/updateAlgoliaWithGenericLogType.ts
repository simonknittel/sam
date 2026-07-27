import { prisma } from "@/db";
import { updateObject } from "@/modules/algolia";
import { type EntityLog } from "@sam-monorepo/database/client";

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
