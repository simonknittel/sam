import { WikiPageEventScope } from "@sam-monorepo/database/browser";
import type {
  EventWikiPagePermissionSource,
  ResolvedEventWikiPagePermissions,
} from "../permissions/resolveEventWikiPagePermissions.js";

export interface EventWikiScopeSelection {
  readonly scope: WikiPageEventScope;
  readonly positionId: string | null;
}

/**
 * Whether the audience of the scope comes from the participation in the
 * event: the participants (PARTICIPANTS) and the citizens of a lineup branch
 * (POSITION). While the participation of the event is turned off, these
 * scopes grant like MANAGERS (fail closed, see
 * `createEventWikiPagePermissionResolver()`).
 */
export const isParticipationEventWikiScope = (scope: WikiPageEventScope) =>
  scope === WikiPageEventScope.PARTICIPANTS ||
  scope === WikiPageEventScope.POSITION;

/** The two scopes of a briefing page */
export enum EventWikiScopeTier {
  Read = "read",
  Edit = "edit",
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

/** The parts of a briefing that the effective scope of a page needs */
interface EventWikiScopeContext {
  readonly permissions: ReadonlyMap<
    string,
    Pick<
      ResolvedEventWikiPagePermissions,
      "readScopeSourceId" | "editScopeSourceId"
    >
  >;
  readonly pagesById: ReadonlyMap<
    string,
    Pick<
      EventWikiPagePermissionSource,
      | "eventReadScope"
      | "eventReadScopePositionId"
      | "eventEditScope"
      | "eventEditScopePositionId"
    >
  >;
}

/**
 * A page's effective read or edit scope after INHERIT resolution, via the
 * resolver's source ids. The fallback source of a fully-inheriting chain
 * keeps INHERIT, which reads as managers-only — matching the resolver.
 * Used to validate and display scope selections against what an INHERIT
 * actually means here.
 */
export const getEffectiveEventWikiScope = (
  context: EventWikiScopeContext,
  pageId: string,
  tier: EventWikiScopeTier,
): EventWikiScopeSelection => {
  const permissions = context.permissions.get(pageId);
  const sourceId =
    tier === EventWikiScopeTier.Read
      ? permissions?.readScopeSourceId
      : permissions?.editScopeSourceId;
  const source = sourceId ? context.pagesById.get(sourceId) : undefined;
  if (!source) return { scope: WikiPageEventScope.MANAGERS, positionId: null };

  const { scope, positionId } =
    tier === EventWikiScopeTier.Read
      ? {
          scope: source.eventReadScope,
          positionId: source.eventReadScopePositionId,
        }
      : {
          scope: source.eventEditScope,
          positionId: source.eventEditScopePositionId,
        };

  return scope === WikiPageEventScope.INHERIT
    ? { scope: WikiPageEventScope.MANAGERS, positionId: null }
    : { scope, positionId };
};
