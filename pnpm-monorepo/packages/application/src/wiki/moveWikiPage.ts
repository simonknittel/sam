import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { requireAdministrableWikiPage } from "./wikiPageAdminGuard.js";
import { getNextWikiPageSortOrder } from "./wikiPageDefaults.js";
import { buildWikiPageReparentReset } from "./wikiPageMoveReset.js";
import {
  buildWikiPageReparentAuditEvents,
  requireWikiPageReparent,
  runWikiPageTreeBatch,
} from "./wikiPageReparent.js";

export const moveWikiPageInputSchema = z.object({
  page_id: idSchema,
  /** Null moves the page to the top level of the global wiki */
  parent_id: idSchema.nullable(),
});

export type MoveWikiPageInput = z.infer<typeof moveWikiPageInputSchema>;

export interface MoveWikiPageOutput {
  readonly page_id: string;
  readonly parent_id: string | null;
  /**
   * The pages that took the permissions of their new place: the page and
   * its descendants
   */
  readonly reset_page_count: number;
}

export const moveWikiPage = (
  context: ApplicationContext,
  actor: Actor,
  input: MoveWikiPageInput,
): Promise<MoveWikiPageOutput> =>
  withSpan(context, "moveWikiPage", async () => {
    const { scope, page } = await requireAdministrableWikiPage(
      context,
      actor,
      input.page_id,
      { rejectBriefingRoot: true },
    );
    const newParentId = input.parent_id;
    requireWikiPageReparent(actor, scope, page, newParentId);

    const updatedById = actor.citizen?.id ?? null;
    const reset = buildWikiPageReparentReset(
      context.prisma,
      scope,
      page.id,
      newParentId,
      updatedById,
    );

    await runWikiPageTreeBatch(context, [
      ...reset.statements,
      context.prisma.wikiPage.update({
        where: { id: page.id, deletedAt: null },
        data: {
          parentId: newParentId,
          sortOrder: getNextWikiPageSortOrder(
            scope.pages.filter((sibling) => sibling.id !== page.id),
            newParentId,
          ),
          updatedById,
        },
        select: { id: true },
      }),
    ]);

    await context.audit.create(
      buildWikiPageReparentAuditEvents(
        page,
        newParentId,
        reset.subtreeIds,
        actor.userId,
      ),
    );

    return {
      page_id: page.id,
      parent_id: newParentId,
      reset_page_count: reset.subtreeIds.length,
    };
  });
