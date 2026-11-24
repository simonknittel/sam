import { collectWikiPageDescendants } from "@sam-monorepo/domain";
import type { WikiPageIndexConfig } from "@sam-monorepo/wiki-editor";
import {
  buildVisibleWikiTree,
  buildWikiPageHref,
  type WikiPageHrefBase,
  type WikiTreeNode,
} from "@sam-monorepo/wiki-editor/helpers";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import {
  getAccessibleWikiPage,
  WikiPageAccessTier,
} from "./getAccessibleWikiPage.js";
import { buildVariantWikiContext } from "./variantWikiContext.js";
import { buildWikiContext } from "./wikiContext.js";
import { requireAccessibleWikiPage, type WikiScope } from "./wikiScope.js";

export interface WikiPageIndexEntry {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly iconId: string | null;
  readonly href: string;
  readonly children: readonly WikiPageIndexEntry[];
}

const toEntries = (
  nodes: readonly WikiTreeNode[],
  hrefBase: WikiPageHrefBase,
): WikiPageIndexEntry[] =>
  nodes.map((node) => ({
    id: node.id,
    title: node.title,
    slug: node.slug,
    iconId: node.iconId,
    href: buildWikiPageHref(hrefBase, node),
    children: toEntries(node.children, hrefBase),
  }));

const trimToDepth = (
  nodes: readonly WikiTreeNode[],
  depth: number,
): WikiTreeNode[] => {
  if (depth <= 0) return [];

  return nodes.map((node) => ({
    ...node,
    children: trimToDepth(node.children, depth - 1),
  }));
};

/**
 * The sidebar mode has no effect: an index on a "dataset" page shows the
 * subpages that the sidebar hides.
 *
 * @param currentPageId The page that holds the node: the root of the tree when
 * the config has no root
 */
export const resolveWikiPageIndex = (
  context: Pick<ApplicationContext, "prisma" | "tracer">,
  scope: WikiScope,
  currentPageId: string,
  config: WikiPageIndexConfig,
): Promise<WikiPageIndexEntry[]> =>
  withSpan(context, "resolveWikiPageIndex", async () => {
    const { pages, pagesById, permissions } = scope;

    switch (config.mode) {
      case "tree": {
        const rootId = config.rootPageId ?? currentPageId;
        const root = pagesById.get(rootId);
        if (!root || root.deletedAt) return [];

        /**
         * Like in the sidebar, the visible descendants of an invisible page
         * go below the nearest visible ancestor (or the root of the index).
         * Thus they stay reachable, and the invisible titles do not leak.
         */
        const descendantIds = new Set(
          collectWikiPageDescendants(pages, rootId),
        );
        const tree = buildVisibleWikiTree(
          pages.filter((page) => descendantIds.has(page.id)),
          permissions,
        );

        return toEntries(
          config.maxDepth === null ? tree : trimToDepth(tree, config.maxDepth),
          scope.hrefBase,
        );
      }

      case "tags": {
        const requestedTagIds = new Set(config.tagIds);
        if (requestedTagIds.size <= 0) return [];

        const assignments = await context.prisma.wikiPageTag.findMany({
          where: { tagId: { in: [...requestedTagIds] } },
          select: { pageId: true, tagId: true },
        });

        const tagIdsByPage = new Map<string, Set<string>>();
        for (const assignment of assignments) {
          const tagIds = tagIdsByPage.get(assignment.pageId) ?? new Set();
          tagIds.add(assignment.tagId);
          tagIdsByPage.set(assignment.pageId, tagIds);
        }

        return [...tagIdsByPage.entries()]
          .filter(
            // "any" needs no filter: each page of the map has a requested tag
            ([, tagIds]) =>
              config.matchMode === "any" ||
              tagIds.size === requestedTagIds.size,
          )
          .map(([pageId]) =>
            getAccessibleWikiPage(scope, pageId, WikiPageAccessTier.Read),
          )
          .filter((page) => page !== null)
          .toSorted((first, second) => first.title.localeCompare(second.title))
          .map((page) => ({
            id: page.id,
            title: page.title,
            slug: page.slug,
            iconId: page.iconId,
            href: buildWikiPageHref(scope.hrefBase, page),
            children: [],
          }));
      }

      default:
        throw new Error(`Unknown mode: ${config.mode satisfies never}`);
    }
  });

export interface FindWikiPageIndexInput extends WikiPageIndexConfig {
  readonly pageId: string;
  /**
   * Resolves in the embed of the variant, with its routes. An unknown
   * variant or a page outside of the embed resolves in the global wiki.
   */
  readonly variantId?: string;
}

/**
 * The node view of the editor loads the pages again after a change of the
 * config. The static render resolves the same config in
 * `findWikiPageContent()`.
 */
export const findWikiPageIndex = async (
  context: ApplicationContext,
  actor: Actor,
  { pageId, variantId, ...config }: FindWikiPageIndexInput,
): Promise<WikiPageIndexEntry[]> => {
  /**
   * The id comes from the embed that shows the editor, thus a stale variant
   * gives the global resolution and not an error
   */
  const variantScope = variantId
    ? await buildVariantWikiContext(context, actor, variantId)
    : null;
  const globalScope =
    variantScope?.globalContext ?? (await buildWikiContext(context, actor));
  requireAccessibleWikiPage(globalScope, pageId, WikiPageAccessTier.Read);

  return resolveWikiPageIndex(
    context,
    variantScope?.pagesById.has(pageId) ? variantScope : globalScope,
    pageId,
    config,
  );
};
