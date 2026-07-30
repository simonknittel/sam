"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";
import { compareWikiPagesByOrder } from "../utils/compareWikiPagesByOrder";

const schema = z.object({
  id: z.cuid2(),
  referenceId: z.cuid2(),
  position: z.enum(["before", "after", "inside"]),
});

/**
 * Drops the page at a new position in the sidebar tree: before/after the
 * reference page (adopting the reference's parent) or as the reference's
 * first subpage. The siblings of the target parent are renumbered
 * sequentially so pages with identical sortOrder (e.g. after a move) become
 * distinct. Reordering within the same parent is deliberately unaudited
 * (cosmetic change, no audit event by design); adopting a different parent
 * creates the same audit event as moveWikiPage.
 */
export const updateWikiPagePosition = createAuthenticatedAction(
  "updateWikiPagePosition",
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

    const reference = context.pagesById.get(data.referenceId);
    if (!reference || reference.deletedAt || reference.id === page.id)
      return { error: t("Common.badRequest"), requestPayload: formData };

    const newParentId =
      data.position === "inside" ? reference.id : reference.parentId;
    const changesParent = newParentId !== page.parentId;

    /** Same checks as moveWikiPage when the page changes its parent */
    if (changesParent) {
      if (newParentId) {
        const newParent = context.pagesById.get(newParentId);
        if (!newParent || newParent.deletedAt)
          return { error: t("Common.badRequest"), requestPayload: formData };
        if (!context.permissions.get(newParent.id)?.canEdit)
          return { error: t("Common.forbidden"), requestPayload: formData };

        /**
         * Prevent cycles: the new parent must not be the page itself or one
         * of its descendants.
         */
        if (
          newParentId === page.id ||
          collectWikiPageDescendants(context.pages, page.id).includes(
            newParentId,
          )
        )
          return { error: t("Common.badRequest"), requestPayload: formData };
      } else {
        if (!(await authentication.authorize("wiki", "create")))
          return { error: t("Common.forbidden"), requestPayload: formData };
      }
    }

    const newSiblings = context.pages
      .filter(
        (sibling) => sibling.parentId === newParentId && sibling.id !== page.id,
      )
      .toSorted(compareWikiPagesByOrder);
    if (data.position === "inside") {
      newSiblings.unshift(page);
    } else {
      const index = newSiblings.findIndex(
        (sibling) => sibling.id === reference.id,
      );
      newSiblings.splice(
        data.position === "before" ? index : index + 1,
        0,
        page,
      );
    }

    const updatedById = authentication.session.entity?.id ?? null;
    const updates = newSiblings.flatMap((sibling, index) => {
      const changed =
        sibling.sortOrder !== index ||
        (sibling.id === page.id && changesParent);
      if (!changed) return [];
      return [
        prisma.wikiPage.update({
          where: { id: sibling.id },
          data:
            sibling.id === page.id
              ? { parentId: newParentId, sortOrder: index, updatedById }
              : { sortOrder: index, updatedById },
        }),
      ];
    });
    if (updates.length > 0) await prisma.$transaction(updates);

    if (changesParent)
      await createAuditEvents([
        {
          type: AuditEventType.WIKI_PAGE_MOVED,
          data: {
            pageId: page.id,
            previousParentId: page.parentId,
            newParentId,
          },
          createdById: authentication.session.user.id,
        },
      ]);

    revalidatePath("/app/wiki", "layout");

    return { success: t("Common.successfullySaved") };
  },
);
