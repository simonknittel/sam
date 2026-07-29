"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";

const schema = z.object({
  id: z.cuid2(),
  /** Empty string moves the page to the top level */
  newParentId: z.union([z.cuid2(), z.literal("")]),
});

export const moveWikiPage = createAuthenticatedAction(
  "moveWikiPage",
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

    const newParentId = data.newParentId === "" ? null : data.newParentId;

    if (newParentId) {
      const newParent = context.pagesById.get(newParentId);
      if (!newParent || newParent.deletedAt)
        return { error: t("Common.badRequest"), requestPayload: formData };
      if (!context.permissions.get(newParent.id)?.canEdit)
        return { error: t("Common.forbidden"), requestPayload: formData };

      /**
       * Prevent cycles: the new parent must not be the page itself or one of
       * its descendants.
       */
      if (
        newParentId === page.id ||
        collectWikiPageDescendants(context.pages, page.id).includes(newParentId)
      )
        return { error: t("Common.badRequest"), requestPayload: formData };
    } else {
      if (!(await authentication.authorize("wiki", "create")))
        return { error: t("Common.forbidden"), requestPayload: formData };
    }

    const siblings = context.pages.filter(
      (sibling) => sibling.parentId === newParentId && sibling.id !== page.id,
    );
    const sortOrder =
      siblings.length > 0
        ? Math.max(...siblings.map((sibling) => sibling.sortOrder)) + 1
        : 0;

    await prisma.wikiPage.update({
      where: { id: page.id },
      data: {
        parentId: newParentId,
        sortOrder,
        updatedById: authentication.session.entity?.id ?? null,
      },
    });

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
