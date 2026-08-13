"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWikiScopeRevalidationPath } from "../queries/getWikiPageScopedContext";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";
import { requireAdminableWikiPage } from "../utils/requireAdminableWikiPage";

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
    const { scoped, page, failure } = await requireAdminableWikiPage(
      data.id,
      formData,
      t,
      { rejectEventWikiRootPage: true },
    );
    if (failure) return failure;
    const context = scoped.context;

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
          eventId: page.eventId ?? undefined,
          title: page.title,
          subtreePageIds: subtreeIds,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    const basePath = getWikiScopeRevalidationPath(scoped);
    revalidatePath(basePath, "layout");
    redirect(basePath);
  },
);
