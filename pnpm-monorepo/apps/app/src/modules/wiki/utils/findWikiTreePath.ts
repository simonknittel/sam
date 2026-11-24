import type { WikiTreeNode } from "@sam-monorepo/wiki-editor/helpers";

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
