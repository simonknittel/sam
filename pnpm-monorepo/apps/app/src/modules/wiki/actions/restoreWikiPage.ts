"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";
import { revalidateWikiScope } from "../queries/getWikiPageScopedContext";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";
import { requireAdminableWikiPage } from "../utils/requireAdminableWikiPage";

const schema = z.object({
  id: z.cuid2(),
});

/**
 * Restores the page from the trash together with its deleted subtree and any
 * deleted ancestors (a page can't be alive under a deleted parent).
 * Trade-off: admin on the restored page suffices to resurrect its deleted
 * ancestors, so a child-admin can undo a parent-admin's deletion — this is
 * structurally necessary.
 */
export const restoreWikiPage = createAuthenticatedAction(
  "restoreWikiPage",
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

    const deletedAncestorIds: string[] = [];
    const visited = new Set<string>([page.id]);
    let current = page.parentId
      ? context.pagesById.get(page.parentId)
      : undefined;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      if (current.deletedAt) deletedAncestorIds.push(current.id);
      current = current.parentId
        ? context.pagesById.get(current.parentId)
        : undefined;
    }

    const restoredIds = [
      page.id,
      ...deletedAncestorIds,
      ...collectWikiPageDescendants(context.allPages, page.id),
    ];

    await prisma.wikiPage.updateMany({
      where: { id: { in: restoredIds }, deletedAt: { not: null } },
      data: { deletedAt: null, deletedById: null },
    });

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_RESTORED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          title: page.title,
          restoredPageIds: restoredIds,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidateWikiScope(scoped);

    return { success: "Erfolgreich wiederhergestellt." };
  },
);
