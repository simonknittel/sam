export interface VisibleWikiSubtreeEntry<
  T extends { id: string; parentId: string | null },
> {
  readonly page: T;
  /**
   * The subtree page (or the root) the page hangs under after invisible
   * ancestors are skipped. Always emitted before the page itself.
   */
  readonly visibleParentId: string;
}

/**
 * Collects the readable descendants of a page in depth-first order, with
 * descendants of unreadable pages hoisted under the nearest readable
 * ancestor — the same flattening the sidebar tree applies, so a duplicate
 * of the subtree matches what the viewer sees. The root itself is not
 * included. Cycle-safe.
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

      if (canRead(child.id)) {
        result.push({ page: child, visibleParentId });
        walk(child.id, child.id);
      } else {
        walk(child.id, visibleParentId);
      }
    }
  };

  walk(rootId, rootId);

  return result;
};
