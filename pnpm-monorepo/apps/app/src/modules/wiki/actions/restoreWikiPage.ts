"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getWikiPageScopedContext,
  getWikiScopeRevalidationPath,
  isWikiScopeFrozen,
} from "../queries/getWikiPageScopedContext";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";

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
    const scoped = await getWikiPageScopedContext(data.id);
    if (!scoped)
      return { error: t("Common.forbidden"), requestPayload: formData };
    const context = scoped.context;

    const page = context.pagesById.get(data.id);
    if (!page?.deletedAt)
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (!context.permissions.get(page.id)?.canAdmin)
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (isWikiScopeFrozen(scoped))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };

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
          title: page.title,
          restoredPageIds: restoredIds,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath(getWikiScopeRevalidationPath(scoped), "layout");

    return { success: "Erfolgreich wiederhergestellt." };
  },
);
