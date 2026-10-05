"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { refresh } from "next/cache";
import * as z from "zod";
import type { WikiSharedContextPage } from "../queries/getWikiContext";
import { getWikiPageScopedContext } from "../queries/getWikiPageScopedContext";
import { getAccessibleWikiPage } from "../utils/getAccessibleWikiPage";

const schema = z.object({
  pageId: z.cuid2(),
  /** Absent removes the page from the favorites */
  isFavorite: z
    .literal("1")
    .optional()
    .transform((value) => value === "1"),
});

/**
 * Sets the state that the button showed as the new state, not the opposite
 * of the stored state: a different tab can have changed the state before.
 */
export const updateWikiPageFavorite = createAuthenticatedAction(
  "updateWikiPageFavorite",
  schema,
  async (formData, authentication, data, t) => {
    const citizenId = authentication.session.entity?.id;
    if (!citizenId)
      return { error: t("Common.notFound"), requestPayload: formData };

    const scoped = await getWikiPageScopedContext(data.pageId);
    const page = scoped
      ? getAccessibleWikiPage<WikiSharedContextPage>(
          scoped.context,
          data.pageId,
          "read",
        )
      : null;
    if (!page) {
      /**
       * A different user deleted the page or took the read access away
       * before, and the page must show it
       */
      refresh();

      return { error: t("Common.notFound"), requestPayload: formData };
    }

    /**
     * No change when the page is already in the requested state: the writes
     * do not fail, and the count tells if they changed something
     */
    const { count } = data.isFavorite
      ? await prisma.wikiPageFavorite.createMany({
          data: [{ citizenId, pageId: page.id }],
          skipDuplicates: true,
        })
      : await prisma.wikiPageFavorite.deleteMany({
          where: { citizenId, pageId: page.id },
        });

    /** Also without a change: a different tab can have set the state before */
    refresh();

    if (count > 0)
      await createAuditEvents([
        {
          type: data.isFavorite
            ? AuditEventType.WIKI_PAGE_FAVORITE_ADDED
            : AuditEventType.WIKI_PAGE_FAVORITE_REMOVED,
          data: {
            pageId: page.id,
            eventId: page.eventId ?? undefined,
            citizenId,
          },
          createdById: authentication.session.user.id,
        },
      ]);

    return {
      success: data.isFavorite
        ? "Als Favorit gespeichert."
        : "Favorit entfernt.",
    };
  },
);
