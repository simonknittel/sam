import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";

/**
 * The keys are not filtered: the callers resolve them against the apps that the
 * actor can see. Thus the row of an app that disappeared or became redacted
 * stays, in case the app returns.
 */
export const findOwnAppFavoriteKeys = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<string[]> => {
  const citizenId = actor.citizen?.id;
  if (!citizenId) return [];

  const favorites = await context.prisma.citizenAppFavorite.findMany({
    where: { citizenId },
    select: { appKey: true },
  });

  return favorites.map((favorite) => favorite.appKey);
};
