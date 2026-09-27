import type { CitizenLogType } from "@/types";
import {
  ConfirmationStatus,
  type Citizen,
  type CitizenLog,
  type Prisma,
} from "@sam-monorepo/database/client";

/**
 * The column of `Citizen` that caches the latest confirmed value of each
 * identity log type. The type check makes sure that each log type except
 * the note has a column.
 */
const CACHE_COLUMN_BY_LOG_TYPE = {
  handle: "handle",
  "discord-id": "discordId",
  "teamspeak-id": "teamspeakId",
  "spectrum-id": "spectrumId",
  "citizen-id": "citizenRecord",
  "community-moniker": "communityMoniker",
} as const satisfies Record<Exclude<CitizenLogType, "note">, keyof Citizen>;

const isCachedLogType = (
  type: string,
): type is keyof typeof CACHE_COLUMN_BY_LOG_TYPE =>
  Object.hasOwn(CACHE_COLUMN_BY_LOG_TYPE, type);

export const updateCitizenCaches = async (
  citizenLog: Pick<CitizenLog, "citizenId" | "type">,
  client: Prisma.TransactionClient,
) => {
  const logType = citizenLog.type;
  if (!isCachedLogType(logType)) return;

  const latestConfirmed = await client.citizenLog.findFirst({
    where: {
      citizenId: citizenLog.citizenId,
      type: citizenLog.type,
      confirmed: ConfirmationStatus.CONFIRMED,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      content: true,
    },
  });

  await client.citizen.update({
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
