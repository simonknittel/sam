interface VisibleWikiSubtreeEntry<
  T extends { id: string; parentId: string | null },
> {
  readonly page: T;
  /** The subtree page it hangs under, always emitted before the page itself */
  readonly visibleParentId: string;
}

/**
 * Collects the readable descendants of a page in depth-first order. An
 * unreadable page takes its whole subtree with it: nothing below it can be
 * readable, because a page grants nothing to someone who cannot read the
 * page above it. The root itself is not included. Cycle-safe.
 */
export const collectVisibleWikiSubtree = <
  T extends { id: string; parentId: string | null },
>(
  pages: readonly T[],
  rootId: string,
  canRead: (id: string) => boolean,
): VisibleWikiSubtreeEntry<T>[] => {
  const childrenByParent = new Map<string, T[]>();
  for (const page of pages) {
    if (!page.parentId) continue;
    const children = childrenByParent.get(page.parentId) ?? [];
    children.push(page);
    childrenByParent.set(page.parentId, children);
  }

  const result: VisibleWikiSubtreeEntry<T>[] = [];
  const visited = new Set<string>([rootId]);

  const walk = (parentId: string, visibleParentId: string) => {
    for (const child of childrenByParent.get(parentId) ?? []) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      if (!canRead(child.id)) continue;

      result.push({ page: child, visibleParentId });
      walk(child.id, child.id);
    }
  };

  walk(rootId, rootId);

  return result;
};
