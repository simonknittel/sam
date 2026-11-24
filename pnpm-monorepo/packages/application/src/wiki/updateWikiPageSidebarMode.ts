import { WikiPageSidebarMode } from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { requireAdministrableWikiPage } from "./wikiPageAdminGuard.js";

export const updateWikiPageSidebarModeInputSchema = z.object({
  page_id: idSchema,
  sidebar_mode: z.enum(WikiPageSidebarMode),
});

export type UpdateWikiPageSidebarModeInput = z.infer<
  typeof updateWikiPageSidebarModeInputSchema
>;

export interface UpdateWikiPageSidebarModeOutput {
  readonly page_id: string;
  readonly sidebar_mode: WikiPageSidebarMode;
  /** False when the page had the mode already */
  readonly changed: boolean;
}

/**
 * Only cosmetic, never a permission, but it changes the navigation of all
 * users, thus it takes the management of the page like a move or a rename
 */
export const updateWikiPageSidebarMode = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateWikiPageSidebarModeInput,
): Promise<UpdateWikiPageSidebarModeOutput> =>
  withSpan(context, "updateWikiPageSidebarMode", async () => {
    const { page } = await requireAdministrableWikiPage(
      context,
      actor,
      input.page_id,
      { rejectBriefingRoot: true },
    );

    /** A different user or tab can have set the mode before */
    if (page.sidebarMode === input.sidebar_mode)
      return {
        page_id: page.id,
        sidebar_mode: page.sidebarMode,
        changed: false,
      };

    await rethrowRecordNotFound(
      () =>
        context.prisma.wikiPage.update({
          where: { id: page.id },
          data: {
            sidebarMode: input.sidebar_mode,
            updatedById: actor.citizen?.id ?? null,
          },
          select: { id: true },
        }),
      WikiErrorMessage.PageNotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.WIKI_PAGE_SIDEBAR_MODE_UPDATED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          previousSidebarMode: page.sidebarMode,
          newSidebarMode: input.sidebar_mode,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      page_id: page.id,
      sidebar_mode: input.sidebar_mode,
      changed: true,
    };
  });
