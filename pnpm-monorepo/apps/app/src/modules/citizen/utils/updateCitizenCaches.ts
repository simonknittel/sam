import { prisma } from "@/db";
import { type Citizen, type CitizenLog } from "@sam-monorepo/database/client";

/**
 * The column of `Citizen` that caches the latest confirmed value of each
 * identity log type
 */
const CACHE_COLUMN_BY_LOG_TYPE = {
  handle: "handle",
  "discord-id": "discordId",
  "teamspeak-id": "teamspeakId",
  "spectrum-id": "spectrumId",
  "citizen-id": "citizenRecord",
  "community-moniker": "communityMoniker",
} as const satisfies Record<string, keyof Citizen>;

const isCachedLogType = (
  type: string,
): type is keyof typeof CACHE_COLUMN_BY_LOG_TYPE =>
  Object.hasOwn(CACHE_COLUMN_BY_LOG_TYPE, type);

export const updateCitizenCaches = async (
  citizenLog: Pick<CitizenLog, "citizenId" | "type">,
) => {
  const logType = citizenLog.type;
  if (!isCachedLogType(logType)) return;

  const latestConfirmed = await prisma.citizenLog.findFirst({
    where: {
      citizenId: citizenLog.citizenId,
      type: citizenLog.type,
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

  await prisma.citizen.update({
    where: {
      id: citizenLog.citizenId,
    },
    data: {
      [CACHE_COLUMN_BY_LOG_TYPE[logType]]: latestConfirmed?.content || null,
    },
    select: {
      id: true,
    },
  });
};
