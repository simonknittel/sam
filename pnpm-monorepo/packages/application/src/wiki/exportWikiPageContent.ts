import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { EMPTY_WIKI_DOCUMENT } from "./wikiContentNormalization.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { canTransferWikiPageContent } from "./wikiPageAdminGuard.js";
import { loadWikiScopeOfPage } from "./wikiScope.js";

export const exportWikiPageContentInputSchema = z.object({
  page_id: idSchema,
});

export type ExportWikiPageContentInput = z.output<
  typeof exportWikiPageContentInputSchema
>;

export interface ExportWikiPageContentOutput {
  readonly slug: string;
  /** Tiptap JSON: the file that `importWikiPageContent` takes */
  readonly content: unknown;
}

/**
 * A read without an audit event. The briefing of an event that is over gives
 * its content too.
 */
export const exportWikiPageContent = (
  context: ApplicationContext,
  actor: Actor,
  input: ExportWikiPageContentInput,
): Promise<ExportWikiPageContentOutput> =>
  withSpan(context, "exportWikiPageContent", async () => {
    const scope = await loadWikiScopeOfPage(context, actor, input.page_id);
    const page = scope?.pagesById.get(input.page_id);
    if (
      !scope ||
      !page ||
      page.deletedAt ||
      !canTransferWikiPageContent(actor, scope, page.id)
    )
      throw new NotFoundError(WikiErrorMessage.PageNotFound);

    const record = await context.prisma.wikiPage.findUnique({
      where: { id: page.id },
      select: { content: true },
    });

    return {
      slug: page.slug,
      content: record?.content ?? EMPTY_WIKI_DOCUMENT,
    };
  });
