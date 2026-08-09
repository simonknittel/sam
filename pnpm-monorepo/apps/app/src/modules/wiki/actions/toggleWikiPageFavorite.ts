"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { WikiSharedContextPage } from "../queries/getWikiContext";
import {
  getWikiPageScopedContext,
  getWikiScopeRevalidationPath,
} from "../queries/getWikiPageScopedContext";
import { getAccessibleWikiPage } from "../utils/getAccessibleWikiPage";

const schema = z.object({
  pageId: z.cuid2(),
});

export const toggleWikiPageFavorite = createAuthenticatedAction(
  "toggleWikiPageFavorite",
  schema,
  async (formData, authentication, data, t) => {
    const scoped = await getWikiPageScopedContext(data.pageId);
    const citizenId = authentication.session.entity?.id;
    if (!scoped || !citizenId)
      return { error: t("Common.notFound"), requestPayload: formData };

    const page = getAccessibleWikiPage<WikiSharedContextPage>(
      scoped.context,
      data.pageId,
      "read",
    );
    if (!page) return { error: t("Common.notFound"), requestPayload: formData };

    const existing = await prisma.wikiPageFavorite.findUnique({
      where: { citizenId_pageId: { citizenId, pageId: page.id } },
    });

    if (existing) {
      await prisma.wikiPageFavorite.delete({
        where: { citizenId_pageId: { citizenId, pageId: page.id } },
      });
    } else {
      await prisma.wikiPageFavorite.create({
        data: { citizenId, pageId: page.id },
      });
    }

    await createAuditEvents([
      {
        type: existing
          ? AuditEventType.WIKI_PAGE_FAVORITE_REMOVED
          : AuditEventType.WIKI_PAGE_FAVORITE_ADDED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          citizenId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath(getWikiScopeRevalidationPath(scoped), "layout");

    return {
      success: existing ? "Favorit entfernt." : "Als Favorit gespeichert.",
    };
  },
);
