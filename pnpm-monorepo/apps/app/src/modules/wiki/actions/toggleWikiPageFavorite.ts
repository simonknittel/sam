"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";

const schema = z.object({
  pageId: z.cuid2(),
});

export const toggleWikiPageFavorite = createAuthenticatedAction(
  "toggleWikiPageFavorite",
  schema,
  async (formData, authentication, data, t) => {
    const context = await getWikiContext();
    const citizenId = authentication.session.entity?.id;
    if (!context || !citizenId)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const page = context.pagesById.get(data.pageId);
    if (!page || page.deletedAt || !context.permissions.get(page.id)?.canRead)
      return { error: t("Common.notFound"), requestPayload: formData };

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

    revalidatePath("/app/wiki", "layout");

    return {
      success: existing ? "Favorit entfernt." : "Als Favorit gespeichert.",
    };
  },
);
