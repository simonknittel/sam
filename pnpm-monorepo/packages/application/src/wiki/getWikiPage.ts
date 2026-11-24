import { EventContainerKind, WikiScopeKind } from "@sam-monorepo/domain";
import { collectWikiPageLinkIds } from "@sam-monorepo/wiki-editor";
import {
  buildWikiPageHref,
  type WikiLinkedPages,
} from "@sam-monorepo/wiki-editor/helpers";
import { renderWikiContentToMarkdown } from "@sam-monorepo/wiki-editor/markdown";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import {
  getAccessibleWikiPage,
  WikiPageAccessTier,
} from "./getAccessibleWikiPage.js";
import {
  loadWikiLinkedVariants,
  loadWikiMentionedCitizens,
} from "./wikiContentReferences.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { loadWikiIframeAllowlist } from "./wikiIframeAllowlist.js";
import { loadWikiLinkablePages } from "./wikiPageContent.js";
import { canAddWikiChildren } from "./wikiPagePlacement.js";
import { findWikiPageTags } from "./wikiPageTags.js";
import {
  isHiddenBriefing,
  loadWikiScopeOfPage,
  type WikiPageScope,
} from "./wikiScope.js";

export const getWikiPageInputSchema = z.object({
  page_id: idSchema,
});

export type GetWikiPageInput = z.output<typeof getWikiPageInputSchema>;

export interface WikiPageReference {
  readonly id: string;
  readonly title: string;
  /** The route of the page, relative to the base URL of the app */
  readonly path: string;
}

export interface GetWikiPageOutput extends WikiPageReference {
  readonly slug: string;
  readonly icon_id: string | null;
  /** Null for a page at the top of the tree */
  readonly parent_id: string | null;
  /** The event of a briefing page, null for a page of the global wiki */
  readonly event_id: string | null;
  readonly tags: { readonly id: string; readonly name: string }[];
  /** The readable pages that the content links to */
  readonly linked_pages: WikiPageReference[];
  readonly created_at: string;
  readonly updated_at: string;
  readonly markdown: string;
  readonly can_add_children: boolean;
}

/** The briefings of the event templates are not available to the MCP tools */
const loadReadableScopeOfPage = async (
  context: ApplicationContext,
  actor: Actor,
  pageId: string,
): Promise<WikiPageScope | null> => {
  const scope = await loadWikiScopeOfPage(context, actor, pageId);
  if (!scope || isHiddenBriefing(scope)) return null;
  if (
    scope.kind === WikiScopeKind.Briefing &&
    scope.container.kind !== EventContainerKind.Event
  )
    return null;

  return scope;
};

export const getWikiPage = (
  context: ApplicationContext,
  actor: Actor,
  input: GetWikiPageInput,
): Promise<GetWikiPageOutput> =>
  withSpan(context, "getWikiPage", async () => {
    const scope = await loadReadableScopeOfPage(context, actor, input.page_id);
    const page =
      scope &&
      getAccessibleWikiPage(scope, input.page_id, WikiPageAccessTier.Read);
    if (!scope || !page) throw new NotFoundError(WikiErrorMessage.PageNotFound);

    const [record, tags, iframeAllowlist, linkablePages] = await Promise.all([
      context.prisma.wikiPage.findUnique({
        where: { id: page.id },
        select: { content: true },
      }),
      findWikiPageTags(context, scope, page.id),
      loadWikiIframeAllowlist(context.prisma),
      loadWikiLinkablePages(context, actor, scope),
    ]);
    const content = record?.content ?? null;

    const [citizens, variants] = await Promise.all([
      loadWikiMentionedCitizens(
        context.prisma,
        actor.authorize("citizen", "read"),
        content,
      ),
      loadWikiLinkedVariants(context, content),
    ]);

    const linkedPageIds = collectWikiPageLinkIds(content);
    const linkedPages: WikiLinkedPages = Object.fromEntries(
      linkedPageIds.map((linkedPageId) => [
        linkedPageId,
        linkablePages.get(linkedPageId) ?? null,
      ]),
    );

    return {
      id: page.id,
      title: page.title,
      slug: page.slug,
      path: buildWikiPageHref(scope.hrefBase, page),
      icon_id: page.iconId,
      parent_id:
        getAccessibleWikiPage(scope, page.parentId, WikiPageAccessTier.Read)
          ?.id ?? null,
      event_id: page.eventId,
      tags,
      linked_pages: linkedPageIds.flatMap((linkedPageId) => {
        const linked = linkablePages.get(linkedPageId);

        return linked
          ? [{ id: linkedPageId, title: linked.title, path: linked.href }]
          : [];
      }),
      created_at: page.createdAt.toISOString(),
      updated_at: page.updatedAt.toISOString(),
      markdown: renderWikiContentToMarkdown(content, {
        baseUrl: context.urls.baseUrl,
        pages: linkedPages,
        citizens,
        variants,
        iframeAllowlist,
      }),
      can_add_children: canAddWikiChildren(scope, page.id),
    };
  });
