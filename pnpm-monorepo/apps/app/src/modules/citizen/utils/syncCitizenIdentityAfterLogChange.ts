import type { CitizenLog, Prisma } from "@sam-monorepo/database/client";
import { relinkCitizenUser } from "./citizenUserLink";
import { updateCitizenCaches } from "./updateCitizenCaches";

/**
 * Updates all data that depends on the confirmed identity logs of a citizen,
 * after a user confirms or deletes one of these logs: the cached attribute
 * columns of the citizen, the link to the login and the display name of the
 * login.
 */
export const syncCitizenIdentityAfterLogChange = async (
  log: Pick<CitizenLog, "citizenId" | "type">,
  client: Prisma.TransactionClient,
) => {
  await updateCitizenCaches(log, client);

  if (log.type === "discord-id") await relinkCitizenUser(log.citizenId, client);

  if (log.type === "handle" || log.type === "discord-id") {
    const citizen = await client.citizen.findUniqueOrThrow({
      where: { id: log.citizenId },
      select: { handle: true, userId: true },
    });

    if (citizen.userId)
      await client.user.update({
        where: { id: citizen.userId },
        data: { name: citizen.handle || log.citizenId },
        select: { id: true },
      });
  }
};
