import { prisma } from "@/db";
import type { CitizenLog } from "@sam-monorepo/database/client";
import { updateCitizenCaches } from "./updateCitizenCaches";

/**
 * Updates all data that depends on the confirmed identity logs of a citizen,
 * after a user confirms or deletes one of these logs: the display name of
 * the linked user account and the cached attribute columns of the citizen.
 */
export const syncCitizenIdentityAfterLogChange = async (
  log: Pick<CitizenLog, "citizenId" | "type">,
) => {
  if (["handle", "discord-id"].includes(log.type)) {
    const citizenLogs = await prisma.citizenLog.findMany({
      where: {
        citizenId: log.citizenId,
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

    const latestConfirmedHandleLog = citizenLogs.find(
      (citizenLog) => citizenLog.type === "handle",
    );
    const latestConfirmedDiscordIdLog = citizenLogs.find(
      (citizenLog) => citizenLog.type === "discord-id",
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
            name: latestConfirmedHandleLog?.content || log.citizenId,
          },
          select: {
            id: true,
          },
        });
      }
    }
  }

  await updateCitizenCaches(log);
};
