"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { refresh } from "next/cache";
import * as z from "zod";
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
     * The condition on `deletedAt` keeps a page that a different user
     * restored in the meantime.
     */
    try {
      await prisma.$transaction(
        [...destroyedIds].reverse().map((id) =>
          prisma.wikiPage.delete({
            where: { id, deletedAt: { not: null } },
          }),
        ),
      );
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) {
        /**
         * A different user or tab restored or permanently deleted a page of
         * the subtree after the check above, and the page must show it. The
         * transaction deleted nothing.
         */
        return rejectConflict(
          "Der Papierkorb war veraltet. Er ist jetzt aktuell, bitte versuche es erneut.",
          formData,
        );
      }
      throw error;
    }

    refresh();

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

    return { success: "Endgültig gelöscht." };
  },
);
