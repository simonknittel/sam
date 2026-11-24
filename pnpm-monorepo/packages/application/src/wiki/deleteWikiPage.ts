import {
  AuditEventType,
  collectWikiPageDescendants,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { findVariantWikiRootPageId } from "./variantWikiRedirect.js";
import { requireAdministrableWikiPage } from "./wikiPageAdminGuard.js";

export const deleteWikiPageInputSchema = z.object({
  page_id: idSchema,
});

export type DeleteWikiPageInput = z.infer<typeof deleteWikiPageInputSchema>;

export interface DeleteWikiPageOptions {
  /**
   * The fleet variant whose embed of the global wiki shows the page, for the
   * redirect back to the variant
   */
  readonly variantId?: string;
}

export interface DeleteWikiPageOutput {
  readonly page_id: string;
  /** The briefing of the page, or null for the global wiki */
  readonly event_id: string | null;
  readonly template_id: string | null;
  readonly deleted_page_ids: string[];
  /**
   * Only with the option `variantId`: the linked page of the variant when
   * the page was in the embed of the variant, else null
   */
  readonly variant_wiki_page_id?: string | null;
}

export const deleteWikiPage = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteWikiPageInput,
  { variantId }: DeleteWikiPageOptions = {},
): Promise<DeleteWikiPageOutput> =>
  withSpan(context, "deleteWikiPage", async () => {
    const { scope, page } = await requireAdministrableWikiPage(
      context,
      actor,
      input.page_id,
      { rejectBriefingRoot: true },
    );

    const subtreeIds = [
      page.id,
      ...collectWikiPageDescendants(scope.pages, page.id),
    ];

    await context.prisma.wikiPage.updateMany({
      where: { id: { in: subtreeIds }, deletedAt: null },
      data: {
        deletedAt: context.now(),
        deletedById: actor.citizen?.id ?? null,
      },
    });

    await context.audit.create([
      {
        type: AuditEventType.WIKI_PAGE_DELETED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          title: page.title,
          subtreePageIds: subtreeIds,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      page_id: page.id,
      event_id: page.eventId,
      template_id: page.templateId,
      deleted_page_ids: subtreeIds,
      ...(variantId === undefined
        ? {}
        : {
            variant_wiki_page_id: await findVariantWikiRootPageId(
              context,
              scope,
              variantId,
              page.id,
              page.parentId,
            ),
          }),
    };
  });
