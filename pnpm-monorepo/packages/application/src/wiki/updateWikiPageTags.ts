import {
  AuditEventType,
  getEventContainerOfRow,
  MAXIMUM_WIKI_PAGE_TAGS,
  WIKI_TAG_NAME_MAXIMUM_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { isWikiScopeFrozen, loadWikiScopeOfPage } from "./wikiScope.js";
import { setWikiPageTags } from "./wikiTags.js";

const wikiTagNameSchema = z
  .string()
  .trim()
  .transform((value) => value.replaceAll(/\s+/g, " "))
  .pipe(z.string().min(1).max(WIKI_TAG_NAME_MAXIMUM_LENGTH));

export const updateWikiPageTagsInputSchema = z.object({
  page_id: idSchema,
  tag_names: z
    .array(wikiTagNameSchema)
    .max(MAXIMUM_WIKI_PAGE_TAGS)
    .describe("The complete set of tags. A missing tag is removed."),
});

export type UpdateWikiPageTagsInput = z.output<
  typeof updateWikiPageTagsInputSchema
>;

export interface UpdateWikiPageTagsOutput {
  readonly page_id: string;
  readonly added_tag_names: string[];
  readonly removed_tag_names: string[];
}

/**
 * Without a change, the output has empty lists and there is no audit event: a
 * different user or tab can have set the same tags before
 */
export const updateWikiPageTags = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateWikiPageTagsInput,
): Promise<UpdateWikiPageTagsOutput> =>
  withSpan(context, "updateWikiPageTags", async () => {
    const scope = await loadWikiScopeOfPage(context, actor, input.page_id);
    const page = scope?.pagesById.get(input.page_id);
    if (!scope || !page || page.deletedAt)
      throw new NotFoundError(WikiErrorMessage.PageNotFound);

    /**
     * The resolver also removes the edit tier in a frozen briefing. This
     * check comes first and gives the usual answer of the events, not a
     * general "forbidden".
     */
    if (isWikiScopeFrozen(scope))
      throw new ConflictError(WikiErrorMessage.BriefingFrozen);
    if (!scope.permissions.get(page.id)?.canEdit)
      throw new ForbiddenError("The user cannot edit the page");

    const changes = await context.prisma.$transaction((transaction) =>
      setWikiPageTags(transaction, {
        pageId: page.id,
        names: input.tag_names,
        container: getEventContainerOfRow(page),
        createdById: actor.citizen?.id ?? null,
      }),
    );

    if (changes.added.length > 0 || changes.removed.length > 0)
      await context.audit.create([
        {
          type: AuditEventType.WIKI_PAGE_TAGS_UPDATED,
          data: {
            pageId: page.id,
            eventId: page.eventId ?? undefined,
            addedTagNames: changes.added,
            removedTagNames: changes.removed,
          },
          createdById: actor.userId,
        },
      ]);

    return {
      page_id: page.id,
      added_tag_names: changes.added,
      removed_tag_names: changes.removed,
    };
  });
