import type { WikiTreeNode } from "./buildVisibleWikiTree";

/**
 * The tree without the given pages and their whole subtrees. The sidebar
 * derives its default view from the full tree with this, so the server
 * sends the pages only once: the sidebar-hidden pages of
 * `filterWikiPagesBySidebarMode` always take their subtrees with them, so
 * the result is the same as building the tree from the filtered pages.
 */
export const pruneWikiTree = (
  nodes: readonly WikiTreeNode[],
  prunedPageIds: ReadonlySet<string>,
): WikiTreeNode[] =>
  nodes
    .filter((node) => !prunedPageIds.has(node.id))
    .map((node) => ({
      ...node,
      children: pruneWikiTree(node.children, prunedPageIds),
    }));
