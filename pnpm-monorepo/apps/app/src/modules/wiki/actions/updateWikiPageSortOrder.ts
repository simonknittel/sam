"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";
import { compareWikiPagesByOrder } from "../utils/compareWikiPagesByOrder";

const schema = z.object({
  id: z.cuid2(),
  direction: z.enum(["up", "down"]),
});

/**
 * Swaps the page's sortOrder with its previous/next sibling. Reordering is
 * deliberately unaudited (cosmetic change, no audit event by design).
 */
export const updateWikiPageSortOrder = createAuthenticatedAction(
  "updateWikiPageSortOrder",
  schema,
  async (formData, authentication, data, t) => {
    const context = await getWikiContext();
    if (!context)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const page = context.pagesById.get(data.id);
    if (!page || page.deletedAt)
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (!context.permissions.get(page.id)?.canAdmin)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const siblings = context.pages
      .filter((sibling) => sibling.parentId === page.parentId)
      .toSorted(compareWikiPagesByOrder);
    const index = siblings.findIndex((sibling) => sibling.id === page.id);
    const neighbor =
      data.direction === "up" ? siblings[index - 1] : siblings[index + 1];
    if (!neighbor) return { success: t("Common.successfullySaved") };

    /**
     * Normalize both sortOrders on swap so pages with identical values
     * (e.g. after a move) become distinct.
     */
    const updatedById = authentication.session.entity?.id ?? null;
    await prisma.$transaction([
      prisma.wikiPage.update({
        where: { id: page.id },
        data: { sortOrder: neighbor.sortOrder, updatedById },
      }),
      prisma.wikiPage.update({
        where: { id: neighbor.id },
        data: {
          sortOrder:
            neighbor.sortOrder === page.sortOrder
              ? page.sortOrder + (data.direction === "up" ? 1 : -1)
              : page.sortOrder,
          updatedById,
        },
      }),
    ]);

    revalidatePath("/app/wiki", "layout");

    return { success: t("Common.successfullySaved") };
  },
);
