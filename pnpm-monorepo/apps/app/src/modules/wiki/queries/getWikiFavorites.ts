import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

/**
 * Ids of the viewer's favorite pages. Unfiltered — callers apply visibility
 * via their wiki context so a page that became invisible simply drops out
 * of the lists (the favorite row is kept in case access returns). Only the
 * viewer's identity is needed here, so no context is loaded — the event
 * sidebar calls this without ever touching the global context.
 */
export const getWikiFavoritePageIds = cache(
  withTrace("getWikiFavoritePageIds", async (): Promise<Set<string>> => {
    const authentication = await authenticate();
    const citizenId = authentication ? authentication.session.entity?.id : null;
    if (!citizenId) return new Set();

    const favorites = await prisma.wikiPageFavorite.findMany({
      where: { citizenId },
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
    const authentication = await authenticate();
    const citizenId = authentication ? authentication.session.entity?.id : null;
    if (!citizenId) return [];

    const visits = await prisma.wikiPageVisit.findMany({
      where: { citizenId },
      orderBy: { lastVisitedAt: "desc" },
      take: 20,
      select: { pageId: true },
    });

    return visits.map((visit) => visit.pageId);
  }),
);
