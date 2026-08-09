/**
 * Hierarchy helpers shared by the role-based and the event wiki permission
 * resolvers. Security-relevant: the "nearest setting wins" walk and the
 * cycle handling must never drift between the two resolvers, so they live
 * here exactly once. The grant rules themselves stay per-resolver.
 */

interface WikiHierarchyPage {
  readonly id: string;
  readonly parentId: string | null;
}

/**
 * Walks up the ancestor chain to the nearest page with an explicit setting
 * ("nearest setting wins"). Falls back to the last reachable ancestor if
 * the whole chain is inheriting, the chain is broken or contains a cycle —
 * the grant checks treat such a fallback source's inherited value as most
 * restrictive. The cache must be dedicated to one setting.
 */
export const findWikiPageSettingSource = <TPage extends WikiHierarchyPage>(
  page: TPage,
  pagesById: ReadonlyMap<string, TPage>,
  cache: Map<string, TPage>,
  hasExplicitSetting: (candidate: TPage) => boolean,
): TPage => {
  const chain: TPage[] = [];
  const visited = new Set<string>();
  let current: TPage | undefined = page;
  let source: TPage | undefined;

  while (current) {
    const cached = cache.get(current.id);
    if (cached) {
      source = cached;
      break;
    }

    visited.add(current.id);
    chain.push(current);

    if (hasExplicitSetting(current)) {
      source = current;
      break;
    }

    const parent: TPage | undefined = current.parentId
      ? pagesById.get(current.parentId)
      : undefined;
    if (!parent || visited.has(parent.id)) {
      // Root reached while inheriting, broken chain or cycle
      source = current;
      break;
    }

    current = parent;
  }

  const result = source ?? page;
  for (const entry of chain) cache.set(entry.id, result);
  return result;
};

/**
 * Memoizes one tier of one page and cuts parent cycles by denying the
 * re-entered page: corrupt data must neither hang the request nor grant
 * access. The pending set must be dedicated to one tier — tiers depend on
 * other tiers of the same page, which must not read as a cycle.
 */
export const resolveWikiPageTier = (
  page: WikiHierarchyPage,
  cache: Map<string, boolean>,
  pending: Set<string>,
  compute: () => boolean,
): boolean => {
  const cached = cache.get(page.id);
  if (cached !== undefined) return cached;
  if (pending.has(page.id)) return false;

  pending.add(page.id);
  const result = compute();
  pending.delete(page.id);

  cache.set(page.id, result);
  return result;
};
