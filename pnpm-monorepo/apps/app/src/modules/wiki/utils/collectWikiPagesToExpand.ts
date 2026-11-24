import type { WikiTreeNode } from "@sam-monorepo/wiki-editor/helpers";
import { findWikiTreePath } from "./findWikiTreePath";

/**
 * Ids the sidebar has to expand so that `pageId` and its direct subpages are
 * visible. Childless pages are left out, see `collectExpandableWikiPages()`.
 */
export const collectWikiPagesToExpand = (
  nodes: readonly WikiTreeNode[],
  pageId: string | undefined,
): string[] => {
  const path = findWikiTreePath(nodes, pageId);
  if (path.at(-1)?.children.length === 0) path.pop();

  return path.map((node) => node.id);
};
