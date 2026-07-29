import { compareWikiPagesByOrder } from "./compareWikiPagesByOrder";
import type { ResolvedWikiPagePermissions } from "./resolveWikiPagePermissions";

export interface WikiTreePageInput {
  readonly id: string;
  readonly parentId: string | null;
  readonly title: string;
  readonly slug: string;
  readonly iconId: string | null;
  readonly sortOrder: number;
}

export interface WikiTreeNode {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly iconId: string | null;
  readonly sortOrder: number;
  /** Whether the viewer may edit the page (e.g. create subpages) */
  readonly canEdit: boolean;
  /** Whether the viewer may administrate the page (e.g. reorder it) */
  readonly canAdmin: boolean;
  readonly children: WikiTreeNode[];
}

/**
 * Builds the tree shown in the wiki sidebar: only pages the viewer can read,
 * with visible descendants of invisible pages flattened under the nearest
 * visible ancestor (or the root), so they stay reachable.
 */
export const buildVisibleWikiTree = (
  pages: readonly WikiTreePageInput[],
  permissions: ReadonlyMap<string, ResolvedWikiPagePermissions>,
): WikiTreeNode[] => {
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const canRead = (id: string) => permissions.get(id)?.canRead === true;

  /**
   * Nearest visible ancestor id, or null for "attach to the root". Cycles and
   * broken chains attach to the root as well.
   */
  const visibleParentOf = (page: WikiTreePageInput) => {
    const visited = new Set<string>([page.id]);
    let current = page.parentId ? pagesById.get(page.parentId) : undefined;

    while (current) {
      if (visited.has(current.id)) return null;
      visited.add(current.id);
      if (canRead(current.id)) return current.id;
      current = current.parentId ? pagesById.get(current.parentId) : undefined;
    }

    return null;
  };

  const childrenByParent = new Map<string | null, WikiTreePageInput[]>();
  for (const page of pages) {
    if (!canRead(page.id)) continue;
    const parentId = visibleParentOf(page);
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(page);
    childrenByParent.set(parentId, siblings);
  }

  const toNodes = (
    parentId: string | null,
    visited: Set<string>,
  ): WikiTreeNode[] => {
    const children = childrenByParent.get(parentId) ?? [];
    return children
      .filter((child) => !visited.has(child.id))
      .toSorted(compareWikiPagesByOrder)
      .map((child) => ({
        id: child.id,
        title: child.title,
        slug: child.slug,
        iconId: child.iconId,
        sortOrder: child.sortOrder,
        canEdit: permissions.get(child.id)?.canEdit === true,
        canAdmin: permissions.get(child.id)?.canAdmin === true,
        children: toNodes(child.id, new Set([...visited, child.id])),
      }));
  };

  return toNodes(null, new Set());
};
