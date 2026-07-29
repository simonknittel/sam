import { prisma } from "@/db";
import { log } from "@/modules/logging";
import { after } from "next/server";
import { serializeError } from "serialize-error";

const THROTTLE_MS = 60 * 60 * 1000;

/**
 * Records a page view for the "Zuletzt besucht" list after the response
 * has been sent. Throttled to one write per page and hour.
 */
export const trackWikiPageVisit = (
  citizenId: string | null,
  pageId: string,
) => {
  if (!citizenId) return;

  after(async () => {
    try {
      const existing = await prisma.wikiPageVisit.findUnique({
        where: { citizenId_pageId: { citizenId, pageId } },
        select: { lastVisitedAt: true },
      });
      if (
        existing &&
        existing.lastVisitedAt.getTime() > Date.now() - THROTTLE_MS
      )
        return;

      await prisma.wikiPageVisit.upsert({
        where: { citizenId_pageId: { citizenId, pageId } },
        create: { citizenId, pageId, lastVisitedAt: new Date() },
        update: { lastVisitedAt: new Date() },
      });
    } catch (error) {
      log.error("Failed to track wiki page visit", {
        error: serializeError(error),
      });
    }
  });
};
