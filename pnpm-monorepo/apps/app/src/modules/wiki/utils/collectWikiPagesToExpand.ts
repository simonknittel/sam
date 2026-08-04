import type { WikiTreeNode } from "./buildVisibleWikiTree";

/**
 * Ids the sidebar has to expand so that `pageId` and its direct subpages are
 * visible: its ancestors from the root down, plus the page itself when it
 * has children. Childless pages are left out on purpose — expanding them
 * would show nothing and only fill up the state they are stored in.
 *
 * Empty when the page is not part of the tree, e.g. because a sidebar mode
 * hides it.
 */
export const collectWikiPagesToExpand = (
  nodes: readonly WikiTreeNode[],
  pageId: string | undefined,
): string[] => {
  if (!pageId) return [];

  const walk = (
    candidates: readonly WikiTreeNode[],
    ancestorIds: string[],
  ): string[] | undefined => {
    for (const candidate of candidates) {
      if (candidate.id === pageId)
        return candidate.children.length > 0
          ? [...ancestorIds, candidate.id]
          : ancestorIds;

      const path = walk(candidate.children, [...ancestorIds, candidate.id]);
      if (path) return path;
    }
  };

  return walk(nodes, []) ?? [];
};
