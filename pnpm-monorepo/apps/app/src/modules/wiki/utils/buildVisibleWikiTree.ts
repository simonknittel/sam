import type { WikiPageTierPermissions } from "@sam-monorepo/permissions";
import { compareWikiPagesByOrder } from "./compareWikiPagesByOrder";

interface WikiTreePageInput {
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
 * Builds the tree shown in the wiki sidebar: the pages the viewer can read,
 * in their real hierarchy. Readable pages always have readable ancestors — a
 * page grants nothing to someone who cannot read the page above it — so only
 * pages whose parent is missing from the list (e.g. deleted) hang at the top
 * level instead.
 */
export const buildVisibleWikiTree = (
  pages: readonly WikiTreePageInput[],
  permissions: ReadonlyMap<string, WikiPageTierPermissions>,
): WikiTreeNode[] => {
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const canRead = (id: string) => permissions.get(id)?.canRead === true;

  const childrenByParent = Map.groupBy(
    pages.filter((page) => canRead(page.id)),
    (page) =>
      page.parentId && pagesById.has(page.parentId) ? page.parentId : null,
  );

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
