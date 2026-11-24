import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";

const MAXIMUM_RECENT_WIKI_VISITS = 20;

/**
 * The ids are not filtered: the callers apply the permissions of their wiki
 * scope, thus a page that became invisible drops out of the lists, and the
 * favorite stays in case the access returns. Needs no scope, thus the sidebar
 * of a briefing can call it without a load of the global wiki.
 */
export const findOwnWikiFavoritePageIds = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<string[]> => {
  const citizenId = actor.citizen?.id;
  if (!citizenId) return [];

  const favorites = await context.prisma.wikiPageFavorite.findMany({
    where: { citizenId },
    select: { pageId: true },
  });

  return favorites.map((favorite) => favorite.pageId);
};

/** The ids are not filtered, like the favorites above */
export const findOwnRecentWikiPageIds = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<string[]> => {
  const citizenId = actor.citizen?.id;
  if (!citizenId) return [];

  const visits = await context.prisma.wikiPageVisit.findMany({
    where: { citizenId },
    orderBy: { lastVisitedAt: "desc" },
    take: MAXIMUM_RECENT_WIKI_VISITS,
    select: { pageId: true },
  });

  return visits.map((visit) => visit.pageId);
};
