import { WikiPageDropPosition } from "@sam-monorepo/domain";
import { compareWikiPagesByOrder } from "@sam-monorepo/wiki-editor/helpers";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import type { WikiSharedContextPage } from "./wikiContext.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { requireAdministrableWikiPage } from "./wikiPageAdminGuard.js";
import { buildWikiPageReparentReset } from "./wikiPageMoveReset.js";
import {
  buildWikiPageReparentAuditEvents,
  requireWikiPageReparent,
  runWikiPageTreeBatch,
} from "./wikiPageReparent.js";

export const updateWikiPagePositionInputSchema = z.object({
  page_id: idSchema,
  /** The page that the page was dropped on */
  reference_page_id: idSchema,
  position: z.enum(WikiPageDropPosition),
});

export type UpdateWikiPagePositionInput = z.infer<
  typeof updateWikiPagePositionInputSchema
>;

export interface UpdateWikiPagePositionOutput {
  readonly page_id: string;
  readonly parent_id: string | null;
  /**
   * True when the page got a new parent: then the page and its descendants
   * took the permissions of their new place
   */
  readonly moved_to_new_parent: boolean;
}

/**
 * The siblings below the parent get new consecutive sort orders, thus pages
 * with the same sort order get different ones. A new order below the same
 * parent writes no audit event (a cosmetic change). A new parent writes the
 * audit events of `moveWikiPage()`.
 */
export const updateWikiPagePosition = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateWikiPagePositionInput,
): Promise<UpdateWikiPagePositionOutput> =>
  withSpan(context, "updateWikiPagePosition", async () => {
    const { scope, page } = await requireAdministrableWikiPage(
      context,
      actor,
      input.page_id,
      { rejectBriefingRoot: true },
    );
    if (input.reference_page_id === page.id)
      throw new ValidationError("A page cannot be dropped on itself");

    /**
     * A different user moved the reference page into the trash or deleted it
     * after the sidebar showed it
     */
    const reference = scope.pagesById.get(input.reference_page_id);
    if (!reference || reference.deletedAt)
      throw new ConflictError(WikiErrorMessage.PageTreeChanged);

    const newParentId =
      input.position === WikiPageDropPosition.Inside
        ? reference.id
        : reference.parentId;
    const changesParent = newParentId !== page.parentId;
    if (changesParent) requireWikiPageReparent(actor, scope, page, newParentId);

    const newSiblings: WikiSharedContextPage[] = scope.pages
      .filter(
        (sibling) => sibling.parentId === newParentId && sibling.id !== page.id,
      )
      .toSorted(compareWikiPagesByOrder);
    const referenceIndex = newSiblings.findIndex(
      (sibling) => sibling.id === reference.id,
    );
    switch (input.position) {
      case WikiPageDropPosition.Inside:
        newSiblings.unshift(page);
        break;

      case WikiPageDropPosition.Before:
        newSiblings.splice(referenceIndex, 0, page);
        break;

      case WikiPageDropPosition.After:
        newSiblings.splice(referenceIndex + 1, 0, page);
        break;

      default:
        throw new Error(
          `Unknown wiki page drop position: ${input.position satisfies never}`,
        );
    }

    const updatedById = actor.citizen?.id ?? null;
    const updates = newSiblings.flatMap((sibling, index) => {
      const isMovedPage = sibling.id === page.id;
      if (sibling.sortOrder === index && !(isMovedPage && changesParent))
        return [];

      return [
        context.prisma.wikiPage.update({
          where: isMovedPage
            ? { id: sibling.id, deletedAt: null }
            : { id: sibling.id },
          data: isMovedPage
            ? { parentId: newParentId, sortOrder: index, updatedById }
            : { sortOrder: index, updatedById },
          select: { id: true },
        }),
      ];
    });
    const reset = changesParent
      ? buildWikiPageReparentReset(
          context.prisma,
          scope,
          page.id,
          newParentId,
          updatedById,
        )
      : null;

    if (updates.length > 0 || reset)
      await runWikiPageTreeBatch(context, [
        ...(reset?.statements ?? []),
        ...updates,
      ]);

    if (reset)
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
      moved_to_new_parent: reset !== null,
    };
  });
