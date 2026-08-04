export enum WikiPagePlacement {
  Allowed = "allowed",
  /** No such page, or it is in the trash */
  Missing = "missing",
  /** The page exists, but the viewer does not manage it */
  Forbidden = "forbidden",
}

interface WikiPagePlacementContext {
  readonly pagesById: ReadonlyMap<string, { readonly deletedAt: Date | null }>;
  readonly permissions: ReadonlyMap<string, { readonly canAdmin: boolean }>;
}

/**
 * Whether the viewer may hang a page — a new, a copied or a moved one —
 * underneath the given page. This takes managing the target, not editing it:
 * editing means changing that page's own content, while adding pages below it
 * decides what the subtree contains and who reaches it. Were edit access
 * enough, whoever may edit a single page could pull every page they can read
 * underneath it, where it would then take on that page's permissions.
 *
 * Placing at the top level has no target page and is gated by the global
 * `wiki;create` permission instead; callers handle that case, and the error
 * message per result, themselves.
 */
export const resolveWikiPagePlacement = (
  context: WikiPagePlacementContext,
  parentId: string,
): WikiPagePlacement => {
  const parent = context.pagesById.get(parentId);
  if (!parent || parent.deletedAt) return WikiPagePlacement.Missing;
  if (!context.permissions.get(parentId)?.canAdmin)
    return WikiPagePlacement.Forbidden;
  return WikiPagePlacement.Allowed;
};
