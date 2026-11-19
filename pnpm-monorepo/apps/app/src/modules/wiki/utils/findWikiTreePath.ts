import type { WikiTreeNode } from "@sam-monorepo/wiki-editor/helpers";

/**
 * The nodes from the root down to the page, the page included. Empty when
 * the page is not part of the tree.
 */
export const findWikiTreePath = (
  nodes: readonly WikiTreeNode[],
  pageId: string | undefined,
): WikiTreeNode[] => {
  if (!pageId) return [];

  for (const node of nodes) {
    if (node.id === pageId) return [node];

    const path = findWikiTreePath(node.children, pageId);
    if (path.length > 0) return [node, ...path];
  }

  return [];
};
