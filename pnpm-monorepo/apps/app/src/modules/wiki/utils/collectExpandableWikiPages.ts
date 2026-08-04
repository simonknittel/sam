import type { WikiTreeNode } from "./buildVisibleWikiTree";

/**
 * Ids of every page with subpages, i.e. the ones "Alle ausklappen" expands.
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
