/**
 * Sibling sort order used by the sidebar tree, the hierarchy selects and the
 * reorder action. All of them must agree: the drag'n'drop action inserts a
 * page relative to its reference sibling within the list produced by this
 * comparator, so a diverging copy would place it somewhere other than the
 * drop position shown in the sidebar.
 */
export const compareWikiPagesByOrder = (
  first: { readonly sortOrder: number; readonly title: string },
  second: { readonly sortOrder: number; readonly title: string },
) =>
  first.sortOrder - second.sortOrder || first.title.localeCompare(second.title);

interface WikiTreePageInput {
  readonly id: string;
  readonly parentId: string | null;
  readonly title: string;
  readonly slug: string;
  readonly iconId: string | null;
  readonly sortOrder: number;
}

interface WikiTreePagePermissions {
  readonly canRead: boolean;
  readonly canEdit: boolean;
  readonly canAdmin: boolean;
}

export interface WikiTreeNode {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly iconId: string | null;
  readonly sortOrder: number;
  readonly canEdit: boolean;
  readonly canAdmin: boolean;
  readonly children: WikiTreeNode[];
}

/**
 * Readable pages always have readable ancestors, so only pages whose parent is
 * missing from the list (e.g. deleted) hang at the top level.
 */
export const buildVisibleWikiTree = (
  pages: readonly WikiTreePageInput[],
  permissions: ReadonlyMap<string, WikiTreePagePermissions>,
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

export interface WikiPageHrefBase {
  /** Route prefix all page URLs live under */
  readonly basePath: string;
  /** Page served at the home of the scope, or null */
  readonly rootPageId: string | null;
  /** Where the root page serves when that differs from the basePath */
  readonly rootHref: string | null;
}

export const buildWikiPageHref = (
  mode: WikiPageHrefBase,
  page: { readonly id: string; readonly slug: string },
) =>
  page.id === mode.rootPageId
    ? (mode.rootHref ?? mode.basePath)
    : `${mode.basePath}/${page.id}/${page.slug}`;
