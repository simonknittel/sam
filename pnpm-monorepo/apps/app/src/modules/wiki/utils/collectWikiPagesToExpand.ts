import type { WikiTreeNode } from "@sam-monorepo/wiki-editor/helpers";
import { findWikiTreePath } from "./findWikiTreePath";

/**
 * Ids the sidebar has to expand so that `pageId` and its direct subpages are
 * visible: its ancestors from the root down, plus the page itself when it
 * has children. Childless pages are left out on purpose — expanding them
 * would show nothing and only fill up the state they are stored in.
 *
 * Empty when the page is not part of the tree.
 */
export const collectWikiPagesToExpand = (
  nodes: readonly WikiTreeNode[],
  pageId: string | undefined,
): string[] => {
  const path = findWikiTreePath(nodes, pageId);
  if (path.at(-1)?.children.length === 0) path.pop();

  return path.map((node) => node.id);
};
