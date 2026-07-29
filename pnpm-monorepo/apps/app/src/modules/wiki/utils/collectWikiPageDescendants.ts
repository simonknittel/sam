/**
 * Collects all descendant ids of a page (excluding the page itself) from a
 * flat page list. Cycle-safe.
 */
export const collectWikiPageDescendants = (
  pages: readonly { id: string; parentId: string | null }[],
  rootId: string,
): string[] => {
  const childrenByParent = new Map<string, string[]>();
  for (const page of pages) {
    if (!page.parentId) continue;
    const children = childrenByParent.get(page.parentId) ?? [];
    children.push(page.id);
    childrenByParent.set(page.parentId, children);
  }

  const descendants: string[] = [];
  const visited = new Set<string>([rootId]);
  const queue = [...(childrenByParent.get(rootId) ?? [])];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    descendants.push(id);
    queue.push(...(childrenByParent.get(id) ?? []));
  }

  return descendants;
};
