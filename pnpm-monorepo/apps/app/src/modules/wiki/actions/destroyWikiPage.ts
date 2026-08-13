"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiScopeRevalidationPath } from "../queries/getWikiPageScopedContext";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";
import { requireAdminableWikiPage } from "../utils/requireAdminableWikiPage";

const schema = z.object({
  id: z.cuid2(),
});

/**
 * Permanently deletes an already soft-deleted page and its subtree.
 * Children are deleted before their parents because of the Restrict FK on
 * parentId.
 */
export const destroyWikiPage = createAuthenticatedAction(
  "destroyWikiPage",
  schema,
  async (formData, authentication, data, t) => {
    const { scoped, page, failure } = await requireAdminableWikiPage(
      data.id,
      formData,
      t,
      { expectDeleted: true },
    );
    if (failure) return failure;
    const context = scoped.context;

    const descendantIds = collectWikiPageDescendants(context.allPages, page.id);
    const destroyedIds = [page.id, ...descendantIds];

    /**
     * deleteMany can't order by depth, so delete leaves-first in a
     * transaction: reverse BFS order guarantees children before parents.
     */
    await prisma.$transaction(
      [...destroyedIds]
        .reverse()
        .map((id) => prisma.wikiPage.delete({ where: { id } })),
    );

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_DESTROYED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          title: page.title,
          destroyedPageIds: destroyedIds,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath(getWikiScopeRevalidationPath(scoped), "layout");

    return { success: "Endgültig gelöscht." };
  },
);
