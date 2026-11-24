import {
  AuditEventType,
  WIKI_PAGE_CONTENT_JSON_MAXIMUM_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { normalizeWikiContent } from "./wikiContentNormalization.js";
import { DisallowedWikiIframesError, WikiErrorMessage } from "./wikiErrors.js";
import { findDisallowedWikiIframeSources } from "./wikiIframeAllowlist.js";
import { canTransferWikiPageContent } from "./wikiPageAdminGuard.js";
import { replaceWikiPageContentWithSafetySnapshot } from "./wikiPageSafetySnapshot.js";
import { isWikiScopeFrozen, loadWikiScopeOfPage } from "./wikiScope.js";

export const importWikiPageContentInputSchema = z.object({
  page_id: idSchema,
  /** The text of the file: a Tiptap JSON document */
  content: z.string().max(WIKI_PAGE_CONTENT_JSON_MAXIMUM_LENGTH),
});

export type ImportWikiPageContentInput = z.output<
  typeof importWikiPageContentInputSchema
>;

export interface ImportWikiPageContentOptions {
  readonly safetySnapshotName: string;
}

export interface ImportWikiPageContentOutput {
  readonly page_id: string;
}

/** An import does not merge */
export const importWikiPageContent = (
  context: ApplicationContext,
  actor: Actor,
  input: ImportWikiPageContentInput,
  options: ImportWikiPageContentOptions,
): Promise<ImportWikiPageContentOutput> =>
  withSpan(context, "importWikiPageContent", async () => {
    const scope = await loadWikiScopeOfPage(context, actor, input.page_id);
    const page = scope?.pagesById.get(input.page_id);
    if (!scope || !page || page.deletedAt)
      throw new NotFoundError(WikiErrorMessage.PageNotFound);
    if (!canTransferWikiPageContent(actor, scope, page.id))
      throw new ForbiddenError();
    if (isWikiScopeFrozen(scope))
      throw new ConflictError(WikiErrorMessage.BriefingFrozen);

    let content: object;
    try {
      content = normalizeWikiContent(JSON.parse(input.content));
    } catch (error) {
      throw new ValidationError(WikiErrorMessage.InvalidImportFile, {
        cause: error,
      });
    }

    const disallowedSources = await findDisallowedWikiIframeSources(
      context.prisma,
      content,
    );
    if (disallowedSources.length > 0)
      throw new DisallowedWikiIframesError(disallowedSources);

    await replaceWikiPageContentWithSafetySnapshot(context, {
      pageId: page.id,
      content,
      updatedByEntityId: actor.citizen?.id ?? null,
      safetySnapshotName: options.safetySnapshotName,
      failureMessage: WikiErrorMessage.ImportFailed,
    });

    await context.audit.create([
      {
        type: AuditEventType.WIKI_PAGE_CONTENT_IMPORTED,
        data: { pageId: page.id, eventId: page.eventId ?? undefined },
        createdById: actor.userId,
      },
    ]);

    return { page_id: page.id };
  });
