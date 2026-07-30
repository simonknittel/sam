/**
 * Sibling sort order used by the sidebar tree, the hierarchy selects and the
 * reorder action. All of them must agree: the drag'n'drop action inserts a
 * page relative to its reference sibling within the list produced by this
 * comparator, so a diverging copy would place it somewhere other than the
 * drop position shown in the sidebar.
 */
export const compareWikiPagesByOrder = (
  a: { readonly sortOrder: number; readonly title: string },
  b: { readonly sortOrder: number; readonly title: string },
) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);
