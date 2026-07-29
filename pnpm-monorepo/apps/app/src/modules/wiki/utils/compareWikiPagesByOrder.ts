/**
 * Sibling sort order used by the sidebar tree, the hierarchy selects and the
 * reorder action. All of them must agree: the reorder arrows swap a page
 * with the neighbor produced by this comparator, so a diverging copy would
 * swap with a different page than the one shown next to it.
 */
export const compareWikiPagesByOrder = (
  a: { readonly sortOrder: number; readonly title: string },
  b: { readonly sortOrder: number; readonly title: string },
) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);
