import { WikiPageEventScope } from "@sam-monorepo/database/client";
import type { EventWikiContext } from "../queries/getEventWikiContext";
import type { EventWikiScopeSelection } from "./isEventWikiScopeSubset";

/**
 * A page's effective read or edit scope after INHERIT resolution, via the
 * resolver's source ids. The fallback source of a fully-inheriting chain
 * keeps INHERIT, which reads as managers-only — matching the resolver.
 * Used to validate and display scope selections against what an INHERIT
 * actually means here.
 */
export const getEffectiveEventWikiScope = (
  context: EventWikiContext,
  pageId: string,
  tier: "read" | "edit",
): EventWikiScopeSelection => {
  const permissions = context.permissions.get(pageId);
  const sourceId =
    tier === "read"
      ? permissions?.readScopeSourceId
      : permissions?.editScopeSourceId;
  const source = sourceId ? context.pagesById.get(sourceId) : undefined;
  if (!source) return { scope: WikiPageEventScope.MANAGERS, positionId: null };

  const { scope, positionId } =
    tier === "read"
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
