import { WikiScopeKind } from "@sam-monorepo/domain";
import {
  collectWikiImageUploadIds,
  collectWikiPageIndexConfigs,
  collectWikiPageLinkIds,
} from "@sam-monorepo/wiki-editor";
import {
  buildWikiPageHref,
  type WikiLinkedPages,
  type WikiLinkedVariant,
  type WikiMentionedCitizen,
  type WikiPageLinkedPage,
} from "@sam-monorepo/wiki-editor/helpers";
import type { Actor } from "../actor.js";
import { getPublicUploadUrl, type ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { WikiPageAccessTier } from "./getAccessibleWikiPage.js";
import type { WikiCitizen } from "./wikiCitizen.js";
import {
  loadWikiLinkedVariants,
  loadWikiMentionedCitizens,
} from "./wikiContentReferences.js";
import { buildWikiContext } from "./wikiContext.js";
import { loadWikiIframeAllowlist } from "./wikiIframeAllowlist.js";
import {
  resolveWikiPageIndex,
  type WikiPageIndexEntry,
} from "./wikiPageIndex.js";
import { loadWikiRoleCitizensByRole } from "./wikiRoleCitizens.js";
import {
  findReadableWikiScope,
  requireAccessibleWikiPage,
  type WikiScope,
  type WikiScopeTarget,
} from "./wikiScope.js";

/** The size of an uploaded image, for the box that the render keeps free */
export interface WikiImageDimensions {
  readonly width: number;
  readonly height: number;
  readonly mimeType: string;
}

/**
 * All that the static render of the content of a page needs for the actor.
 * The collab editor gets it as its first data, because it renders the same
 * nodes.
 */
export interface WikiPageStaticContent {
  readonly content: unknown;
  readonly iframeAllowlist: string[];
  /**
   * The pages that the content links to, by id. Null for a page that the
   * actor cannot see. Only these pages: the editor loads the other linkable
   * pages when it needs them (`findWikiLinkablePages()`).
   */
  readonly linkedPages: WikiLinkedPages;
  readonly mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>;
  readonly linkedVariants: Readonly<Record<string, WikiLinkedVariant>>;
  /** The pages of each page-index node, by the key of its config */
  readonly pageIndexes: Readonly<Record<string, WikiPageIndexEntry[]>>;
  readonly roleCitizens: Readonly<Record<string, WikiCitizen[]>>;
  /**
   * The sizes of the uploaded images of the content, by upload. An upload
   * without a known size is not in the record: its image renders as a plain
   * image.
   */
  readonly imageDimensions: Readonly<Record<string, WikiImageDimensions>>;
}

interface WikiLinkablePage extends WikiPageLinkedPage {
  href: string;
}

/**
 * The scopes whose pages a page of the scope can link to, the scope itself
 * last. A briefing page can link into the global wiki, but a page of the
 * global wiki never links into a briefing. All pages of a variant embed are
 * pages of the global wiki: the pages of the embed get the routes of the
 * embed, all other pages link to the global wiki.
 */
const loadLinkableWikiScopes = async (
  context: ApplicationContext,
  actor: Actor,
  scope: WikiScope,
): Promise<WikiScope[]> => {
  switch (scope.kind) {
    case WikiScopeKind.Wiki:
      return [scope];

    case WikiScopeKind.Briefing:
      return [await buildWikiContext(context, actor), scope];

    case WikiScopeKind.Variant:
      return [scope.globalContext, scope];

    default:
      throw new Error(`Unknown wiki scope: ${scope satisfies never}`);
  }
};

/**
 * The pages that a page of the scope can link to, by id: the pages that the
 * actor can read, each with the route of its scope (see
 * `loadLinkableWikiScopes()`). A later scope replaces the entry of an
 * earlier scope. The pages that the actor cannot read are not in the map,
 * thus their titles do not leak.
 */
export const loadWikiLinkablePages = async (
  context: ApplicationContext,
  actor: Actor,
  scope: WikiScope,
): Promise<Map<string, WikiLinkablePage>> =>
  new Map(
    (await loadLinkableWikiScopes(context, actor, scope)).flatMap(
      (linkableScope) =>
        linkableScope.pages
          .filter((page) => linkableScope.permissions.get(page.id)?.canRead)
          .map(
            (page) =>
              [
                page.id,
                {
                  title: page.title,
                  slug: page.slug,
                  iconSrc: page.iconId
                    ? getPublicUploadUrl(context.urls, page.iconId)
                    : undefined,
                  href: buildWikiPageHref(linkableScope.hrefBase, page),
                },
              ] as const,
          ),
    ),
  );

/**
 * All pages that a page of the scope can link to, by id, for the "[["
 * suggestion of the editor and for the links that the editor adds after the
 * render. A scope that the actor cannot hold gives no pages.
 */
export const findWikiLinkablePages = async (
  context: ApplicationContext,
  actor: Actor,
  target: WikiScopeTarget,
): Promise<Record<string, WikiPageLinkedPage>> => {
  const scope = await findReadableWikiScope(context, actor, target);
  if (!scope) return {};

  return Object.fromEntries(await loadWikiLinkablePages(context, actor, scope));
};

const loadWikiImageDimensions = async (
  context: ApplicationContext,
  content: unknown,
): Promise<Record<string, WikiImageDimensions>> => {
  const imageUploadIds = collectWikiImageUploadIds(
    content,
    context.urls.publicUploadBaseUrl,
  );
  if (imageUploadIds.length === 0) return {};

  const uploads = await context.prisma.upload.findMany({
    where: { id: { in: imageUploadIds }, width: { not: null } },
    select: { id: true, width: true, height: true, mimeType: true },
  });

  const imageDimensions: Record<string, WikiImageDimensions> = {};
  for (const upload of uploads) {
    if (upload.width === null || upload.height === null) continue;

    imageDimensions[upload.id] = {
      width: upload.width,
      height: upload.height,
      mimeType: upload.mimeType,
    };
  }

  return imageDimensions;
};

/**
 * The page-index nodes resolve in the scope only, thus they never list pages
 * of a different scope
 */
export const findWikiPageContent = (
  context: ApplicationContext,
  actor: Actor,
  scope: WikiScope,
  pageId: string,
): Promise<WikiPageStaticContent> =>
  withSpan(context, "findWikiPageContent", async () => {
    requireAccessibleWikiPage(scope, pageId, WikiPageAccessTier.Read);

    const [page, iframeAllowlist, linkablePages] = await Promise.all([
      /**
       * The scopes do not hold the content: they load all pages on each
       * request of the wiki
       */
      context.prisma.wikiPage.findUnique({
        where: { id: pageId },
        select: { content: true },
      }),
      loadWikiIframeAllowlist(context.prisma),
      loadWikiLinkablePages(context, actor, scope),
    ]);
    const content = page?.content;

    const linkedPages: WikiLinkedPages = Object.fromEntries(
      collectWikiPageLinkIds(content).map((linkedPageId) => [
        linkedPageId,
        linkablePages.get(linkedPageId) ?? null,
      ]),
    );

    const [
      pageIndexes,
      mentionedCitizens,
      linkedVariants,
      roleCitizens,
      imageDimensions,
    ] = await Promise.all([
      Promise.all(
        collectWikiPageIndexConfigs(content).map(
          async ({ key, config }) =>
            [
              key,
              await resolveWikiPageIndex(context, scope, pageId, config),
            ] as const,
        ),
      ).then((entries) => Object.fromEntries(entries)),
      loadWikiMentionedCitizens(
        context.prisma,
        actor.authorize("citizen", "read"),
        content,
      ),
      loadWikiLinkedVariants(context, content),
      loadWikiRoleCitizensByRole(context, actor, content),
      loadWikiImageDimensions(context, content),
    ]);

    return {
      content,
      iframeAllowlist,
      linkedPages,
      mentionedCitizens,
      linkedVariants,
      pageIndexes,
      roleCitizens,
      imageDimensions,
    };
  });
