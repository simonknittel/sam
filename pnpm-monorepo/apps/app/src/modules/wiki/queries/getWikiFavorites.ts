import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { getWikiContext } from "./getWikiContext";

/**
 * Ids of the viewer's favorite pages. Unfiltered — callers apply visibility
 * via the wiki context so a page that became invisible simply drops out of
 * the lists (the favorite row is kept in case access returns).
 */
export const getWikiFavoritePageIds = cache(
  withTrace("getWikiFavoritePageIds", async (): Promise<Set<string>> => {
    const context = await getWikiContext();
    if (!context?.viewer.citizenId) return new Set();

    const favorites = await prisma.wikiPageFavorite.findMany({
      where: { citizenId: context.viewer.citizenId },
      select: { pageId: true },
    });

    return new Set(favorites.map((favorite) => favorite.pageId));
  }),
);

/**
 * Ids of the viewer's most recently visited pages, newest first.
 * Unfiltered like the favorites above.
 */
export const getWikiRecentVisitPageIds = cache(
  withTrace("getWikiRecentVisitPageIds", async (): Promise<string[]> => {
    const context = await getWikiContext();
    if (!context?.viewer.citizenId) return [];

    const visits = await prisma.wikiPageVisit.findMany({
      where: { citizenId: context.viewer.citizenId },
      orderBy: { lastVisitedAt: "desc" },
      take: 20,
      select: { pageId: true },
    });

    return visits.map((visit) => visit.pageId);
  }),
);
