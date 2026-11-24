import type { WikiTreeNode } from "@sam-monorepo/wiki-editor/helpers";

/**
 * Childless pages are left out: expanding them would show nothing and only
 * fill up the state they are stored in.
 */
export const collectExpandableWikiPages = (
  nodes: readonly WikiTreeNode[],
): string[] =>
  nodes.flatMap((node) =>
    node.children.length > 0
      ? [node.id, ...collectExpandableWikiPages(node.children)]
      : [],
  );
