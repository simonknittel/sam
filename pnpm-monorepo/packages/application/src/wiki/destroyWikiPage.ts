import {
  AuditEventType,
  collectWikiPageDescendants,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { requireAdministrableWikiPage } from "./wikiPageAdminGuard.js";

export const destroyWikiPageInputSchema = z.object({
  page_id: idSchema,
});

export type DestroyWikiPageInput = z.infer<typeof destroyWikiPageInputSchema>;

export interface DestroyWikiPageOutput {
  readonly page_id: string;
  readonly destroyed_page_ids: string[];
}

export const destroyWikiPage = (
  context: ApplicationContext,
  actor: Actor,
  input: DestroyWikiPageInput,
): Promise<DestroyWikiPageOutput> =>
  withSpan(context, "destroyWikiPage", async () => {
    const { scope, page } = await requireAdministrableWikiPage(
      context,
      actor,
      input.page_id,
      { expectDeleted: true },
    );

    const destroyedIds = [
      page.id,
      ...collectWikiPageDescendants(scope.allPages, page.id),
    ];

    /**
     * The foreign key of the parent restricts the deletion, and `deleteMany`
     * has no order, thus the batch deletes the pages one by one, the leaves
     * first (the reverse of the breadth-first order). The condition on
     * `deletedAt` keeps a page that a different user restored in the
     * meantime: then the batch deletes nothing.
     */
    await rethrowRecordNotFound(
      () =>
        context.prisma.$transaction(
          destroyedIds.toReversed().map((id) =>
            context.prisma.wikiPage.delete({
              where: { id, deletedAt: { not: null } },
              select: { id: true },
            }),
          ),
        ),
      WikiErrorMessage.TrashChanged,
    );

    await context.audit.create([
      {
        type: AuditEventType.WIKI_PAGE_DESTROYED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          title: page.title,
          destroyedPageIds: destroyedIds,
        },
        createdById: actor.userId,
      },
    ]);

    return { page_id: page.id, destroyed_page_ids: destroyedIds };
  });
