import {
  AuditEventType,
  collectWikiPageAncestors,
  collectWikiPageDescendants,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { requireAdministrableWikiPage } from "./wikiPageAdminGuard.js";

export const restoreWikiPageInputSchema = z.object({
  page_id: idSchema,
});

export type RestoreWikiPageInput = z.infer<typeof restoreWikiPageInputSchema>;

export interface RestoreWikiPageOutput {
  readonly page_id: string;
  /** The page, its ancestors in the trash and its descendants */
  readonly restored_page_ids: string[];
}

/**
 * Trade-off: the management of the page is enough to restore its ancestors,
 * thus the manager of a child page can undo the deletion of a parent page by
 * its manager. The tree needs it.
 */
export const restoreWikiPage = (
  context: ApplicationContext,
  actor: Actor,
  input: RestoreWikiPageInput,
): Promise<RestoreWikiPageOutput> =>
  withSpan(context, "restoreWikiPage", async () => {
    const { scope, page } = await requireAdministrableWikiPage(
      context,
      actor,
      input.page_id,
      { expectDeleted: true },
    );

    const restoredIds = [
      page.id,
      /** A page cannot be live below a parent in the trash */
      ...collectWikiPageAncestors(scope.pagesById, page).filter(
        (ancestorId) => scope.pagesById.get(ancestorId)?.deletedAt,
      ),
      ...collectWikiPageDescendants(scope.allPages, page.id),
    ];

    await context.prisma.wikiPage.updateMany({
      where: { id: { in: restoredIds }, deletedAt: { not: null } },
      data: { deletedAt: null, deletedById: null },
    });

    await context.audit.create([
      {
        type: AuditEventType.WIKI_PAGE_RESTORED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          title: page.title,
          restoredPageIds: restoredIds,
        },
        createdById: actor.userId,
      },
    ]);

    return { page_id: page.id, restored_page_ids: restoredIds };
  });
