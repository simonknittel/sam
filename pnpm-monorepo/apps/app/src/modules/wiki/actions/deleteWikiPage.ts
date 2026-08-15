"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getWikiScopeRevalidationPath,
  revalidateWikiScope,
} from "../queries/getWikiPageScopedContext";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";
import { requireAdminableWikiPage } from "../utils/requireAdminableWikiPage";
import { getVariantWikiRootPath, WikiScope } from "../utils/wikiPageHref";

const schema = z.object({
  id: z.cuid2(),
  /** Set when deleting from inside a variant embed, for the redirect */
  variantId: z.cuid().optional(),
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

    revalidateWikiScope(scoped);

    /**
     * Deleting from inside a variant embed leads back to the variant page.
     * The target only ever derives from a database-validated variant id —
     * a stale or foreign id silently falls back to the scope's home, and
     * nothing user-controlled reaches the redirect (no open redirect).
     */
    if (data.variantId && scoped.scope === WikiScope.Wiki) {
      const variant = await prisma.variant.findUnique({
        where: { id: data.variantId },
        select: { id: true },
      });
      if (variant) redirect(getVariantWikiRootPath(variant.id));
    }

    redirect(getWikiScopeRevalidationPath(scoped));
  },
);
