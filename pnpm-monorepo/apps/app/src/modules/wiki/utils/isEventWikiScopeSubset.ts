import { WikiPageEventScope } from "@sam-monorepo/database/browser";

export interface EventWikiScopeSelection {
  readonly scope: WikiPageEventScope;
  readonly positionId: string | null;
}

interface FlatPosition {
  readonly id: string;
  readonly parentPositionId: string | null;
}

/**
 * Whether `inner`'s audience is contained in `outer`'s — the rule that
 * keeps a page's edit scope a subset of its read scope. The scopes order as
 * MANAGERS ⊆ POSITION ⊆ PARTICIPANTS ⊆ ALL (assigned citizens are event
 * participants: the scraper drops assignments when a participant leaves),
 * and one POSITION is contained in another exactly when its position sits
 * in the other's subtree. Callers resolve INHERIT to the effective ancestor
 * scope first; a leftover INHERIT counts as MANAGERS (fail closed), and a
 * dangling POSITION contains nothing but the managers.
 */
export const isEventWikiScopeSubset = (
  inner: EventWikiScopeSelection,
  outer: EventWikiScopeSelection,
  positions: readonly FlatPosition[],
): boolean => {
  const innerScope =
    inner.scope === WikiPageEventScope.INHERIT
      ? WikiPageEventScope.MANAGERS
      : inner.scope;
  const outerScope =
    outer.scope === WikiPageEventScope.INHERIT
      ? WikiPageEventScope.MANAGERS
      : outer.scope;

  if (innerScope === WikiPageEventScope.MANAGERS) return true;
  if (outerScope === WikiPageEventScope.ALL) return true;
  if (outerScope === WikiPageEventScope.MANAGERS) return false;

  if (outerScope === WikiPageEventScope.PARTICIPANTS)
    return (
      innerScope === WikiPageEventScope.PARTICIPANTS ||
      innerScope === WikiPageEventScope.POSITION
    );

  // outer POSITION: inner must be a position inside the outer's subtree
  if (innerScope !== WikiPageEventScope.POSITION) return false;
  if (!inner.positionId || !outer.positionId) return false;

  const parentIdsById = new Map(
    positions.map((position) => [position.id, position.parentPositionId]),
  );
  const visited = new Set<string>();
  let currentId: string | null = inner.positionId;
  while (currentId && !visited.has(currentId)) {
    if (currentId === outer.positionId) return true;
    visited.add(currentId);
    currentId = parentIdsById.get(currentId) ?? null;
  }

  return false;
};
