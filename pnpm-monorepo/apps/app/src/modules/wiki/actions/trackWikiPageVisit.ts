"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";
import type { WikiSharedContextPage } from "../queries/getWikiContext";
import { getWikiPageScopedContext } from "../queries/getWikiPageScopedContext";
import { getAccessibleWikiPage } from "../utils/getAccessibleWikiPage";

const THROTTLE_MS = 60 * 60 * 1000;

const schema = z.object({
  pageId: z.cuid2(),
});

/**
 * Records a page view for the "Zuletzt besucht" list. Triggered from the
 * client after the page mounted (see `<TrackWikiPageVisit>`) instead of
 * during the server render, because hover-triggered prefetching renders
 * pages the user never visits — while a navigation served from the
 * prefetch cache produces no server render at all. Throttled to one write
 * per page and hour — the audit event follows the same throttle and
 * therefore counts visiting sessions, not requests.
 */
export const trackWikiPageVisit = createAuthenticatedAction(
  "trackWikiPageVisit",
  schema,
  async (formData, authentication, data, t) => {
    const citizenId = authentication.session.entity?.id;
    if (!citizenId)
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * The throttle only reads the viewer's own rows, so it may run before
     * the permission check — repeat visits then skip loading the context.
     */
    const existing = await prisma.wikiPageVisit.findUnique({
      where: { citizenId_pageId: { citizenId, pageId: data.pageId } },
      select: { lastVisitedAt: true },
    });
    if (existing && existing.lastVisitedAt.getTime() > Date.now() - THROTTLE_MS)
      return { success: "Seitenbesuch gespeichert." };

    const scoped = await getWikiPageScopedContext(data.pageId);
    if (!scoped)
      return { error: t("Common.notFound"), requestPayload: formData };

    const page = getAccessibleWikiPage<WikiSharedContextPage>(
      scoped.context,
      data.pageId,
      "read",
    );
    if (!page) return { error: t("Common.notFound"), requestPayload: formData };

    await prisma.wikiPageVisit.upsert({
      where: { citizenId_pageId: { citizenId, pageId: page.id } },
      create: { citizenId, pageId: page.id, lastVisitedAt: new Date() },
      update: { lastVisitedAt: new Date() },
    });

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_VISITED,
        data: { pageId: page.id, citizenId },
        createdById: authentication.session.user.id,
      },
    ]);

    return { success: "Seitenbesuch gespeichert." };
  },
);
