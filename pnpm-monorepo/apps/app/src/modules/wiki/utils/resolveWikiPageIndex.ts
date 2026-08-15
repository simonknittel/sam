import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { WikiPageIndexConfig } from "@sam-monorepo/wiki-editor";
import type { WikiPageIndexEntry } from "../components/WikiPageIndexList";
import type { WikiSharedContext } from "../queries/getWikiContext";
import {
  buildVisibleWikiTree,
  type WikiTreeNode,
} from "./buildVisibleWikiTree";
import { collectWikiPageDescendants } from "./collectWikiPageDescendants";
import { getAccessibleWikiPage } from "./getAccessibleWikiPage";
import {
  buildWikiPageHref,
  GLOBAL_WIKI_HREF_MODE,
  type WikiPageHrefMode,
} from "./wikiPageHref";

const toEntries = (
  nodes: readonly WikiTreeNode[],
  hrefMode: WikiPageHrefMode,
): WikiPageIndexEntry[] =>
  nodes.map((node) => ({
    id: node.id,
    title: node.title,
    slug: node.slug,
    iconId: node.iconId,
    href: buildWikiPageHref(hrefMode, node),
    children: toEntries(node.children, hrefMode),
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
 * Resolves a page-index node's config into the page list the current viewer
 * may see. Only ever returns visible, not-deleted pages. Deliberately
 * ignores `sidebarMode` — an index on a "dataset" page is how sidebar-hidden
 * child pages get surfaced.
 */
export const resolveWikiPageIndex = withTrace(
  "resolveWikiPageIndex",
  async (
    context: WikiSharedContext,
    /** The page containing the node — the root when `rootPageId` is null */
    currentPageId: string,
    config: WikiPageIndexConfig,
    /** Scope the entry links render under; defaults to the global wiki */
    hrefMode: WikiPageHrefMode = GLOBAL_WIKI_HREF_MODE,
  ): Promise<WikiPageIndexEntry[]> => {
    switch (config.mode) {
      case "tree": {
        const rootId = config.rootPageId ?? currentPageId;
        const root = context.pagesById.get(rootId);
        if (!root || root.deletedAt) return [];

        /**
         * Like the sidebar, visible descendants of invisible intermediate
         * pages flatten under the nearest visible ancestor (or the index
         * root), so they stay reachable without leaking invisible titles.
         */
        const descendantIds = new Set(
          collectWikiPageDescendants(context.pages, rootId),
        );
        const tree = buildVisibleWikiTree(
          context.pages.filter((page) => descendantIds.has(page.id)),
          context.permissions,
        );

        return toEntries(
          config.maxDepth === null ? tree : trimToDepth(tree, config.maxDepth),
          hrefMode,
        );
      }
      case "tags": {
        const requestedTagIds = new Set(config.tagIds);
        if (requestedTagIds.size <= 0) return [];

        const assignments = await prisma.wikiPageTag.findMany({
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
            // "any" needs no filter — every entry has a matching tag by
            // construction
            ([, tagIds]) =>
              config.matchMode === "any" ||
              tagIds.size === requestedTagIds.size,
          )
          .map(([pageId]) => getAccessibleWikiPage(context, pageId, "read"))
          .filter((page) => page !== null)
          .toSorted((a, b) => a.title.localeCompare(b.title))
          .map((page) => ({
            id: page.id,
            title: page.title,
            slug: page.slug,
            iconId: page.iconId,
            href: buildWikiPageHref(hrefMode, page),
            children: [],
          }));
      }
      default:
        throw new Error(`Unknown mode: ${config.mode satisfies never}`);
    }
  },
);
