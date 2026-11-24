import { AuditEventType, slugifyWikiPageTitle } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { createWikiPageInputSchema } from "./createWikiPage.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { requireAdministrableWikiPage } from "./wikiPageAdminGuard.js";

export const renameWikiPageInputSchema = z.object({
  page_id: idSchema,
  title: createWikiPageInputSchema.shape.title,
});

export type RenameWikiPageInput = z.infer<typeof renameWikiPageInputSchema>;

export interface RenameWikiPageOutput {
  readonly page_id: string;
  readonly title: string;
  readonly slug: string;
}

/**
 * The old route of the page stays usable, because a route finds a page by its
 * id
 */
export const renameWikiPage = (
  context: ApplicationContext,
  actor: Actor,
  input: RenameWikiPageInput,
): Promise<RenameWikiPageOutput> =>
  withSpan(context, "renameWikiPage", async () => {
    const { page } = await requireAdministrableWikiPage(
      context,
      actor,
      input.page_id,
      { rejectBriefingRoot: true },
    );

    const slug = slugifyWikiPageTitle(input.title);
    await rethrowRecordNotFound(
      () =>
        context.prisma.wikiPage.update({
          where: { id: page.id },
          data: {
            title: input.title,
            slug,
            updatedById: actor.citizen?.id ?? null,
          },
          select: { id: true },
        }),
      WikiErrorMessage.PageNotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.WIKI_PAGE_RENAMED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          previousTitle: page.title,
          newTitle: input.title,
        },
        createdById: actor.userId,
      },
    ]);

    return { page_id: page.id, title: input.title, slug };
  });
