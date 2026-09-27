import { prisma } from "@sam-monorepo/database";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";

/**
 * The citizen of a Discord user, for example of the creator of a Discord
 * event. A deleted citizen does not match. Returns null if no citizen
 * matches.
 */
export const findCitizenIdByDiscordId = async (discordId: string | null) => {
  if (discordId === null) return null;

  const citizen = await prisma.citizen.findFirst({
    where: {
      discordId,
      ...ACTIVE_CITIZEN_WHERE,
    },
    select: {
      id: true,
    },
  });

  return citizen?.id ?? null;
};
