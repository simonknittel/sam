"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";

const schema = z.object({
  id: z.cuid2(),
});

/**
 * Soft-deletes the page including its whole subtree (like deleting a
 * directory). Restorable from the trash for 30 days.
 */
export const deleteWikiPage = createAuthenticatedAction(
  "deleteWikiPage",
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

    const subtreeIds = [
      page.id,
      ...collectWikiPageDescendants(context.pages, page.id),
    ];

    await prisma.wikiPage.updateMany({
      where: { id: { in: subtreeIds }, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedById: authentication.session.entity?.id ?? null,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_DELETED,
        data: {
          pageId: page.id,
          title: page.title,
          subtreePageIds: subtreeIds,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/wiki", "layout");
    redirect("/app/wiki");
  },
);
