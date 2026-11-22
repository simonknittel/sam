import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { canReadCitizen } from "./citizenAccess.js";

/**
 * The Discord avatars of the citizens, by the id of the citizen. The URL
 * holds the Discord id, thus only the citizens that the actor can read get
 * an avatar, like on the profile. A deleted citizen, a citizen without a
 * login and a login without an avatar get no entry.
 */
export const findCitizenAvatarUrls = async (
  context: ApplicationContext,
  actor: Actor,
  citizenIds: readonly string[],
): Promise<ReadonlyMap<string, string>> => {
  const readableCitizenIds = [...new Set(citizenIds)].filter((citizenId) =>
    canReadCitizen(actor, citizenId),
  );
  if (readableCitizenIds.length <= 0) return new Map();

  const citizens = await context.prisma.citizen.findMany({
    where: { id: { in: readableCitizenIds }, deletedAt: null },
    select: { id: true, user: { select: { image: true } } },
  });

  return new Map(
    citizens.flatMap((citizen) =>
      citizen.user?.image ? [[citizen.id, citizen.user.image] as const] : [],
    ),
  );
};
