import { WikiPageEventScope } from "@sam-monorepo/database/browser";
import type { EventWikiScopeSelection } from "./isEventWikiScopeSubset";

/**
 * Who may read a page of the global wiki, condensed for the header badge.
 * The count deliberately leaves out roles that read only because they hold
 * `wiki;manage` — those read every page and say nothing about this one.
 */
export interface WikiRoleReadAudience {
  /** Everybody with wiki access may read the page */
  readonly isEverybody: boolean;
  readonly roleCount: number;
}

/** The widest audience, worded the same in both wiki models */
const EVERYBODY_LABEL = "alle";

/**
 * The read audience of a global wiki page. Roles are counted rather than
 * named: the role data behind the count is not filtered by the viewer's
 * `otherRole;read` permission, so the names must not reach the page.
 */
export const getWikiRoleReadAudienceLabel = ({
  isEverybody,
  roleCount,
}: WikiRoleReadAudience): string => {
  if (isEverybody) return EVERYBODY_LABEL;
  if (roleCount === 0) return "nur Besitzer & Manager";
  return roleCount === 1 ? "1 Rolle" : `${roleCount} Rollen`;
};

/**
 * The read audience of an event wiki page. Takes the page's effective read
 * scope, so `getEffectiveEventWikiScope()` resolves the inheritance first.
 */
export const getEventWikiReadAudienceLabel = (
  { scope, positionId }: EventWikiScopeSelection,
  positionNameOf: (positionId: string) => string | undefined,
): string => {
  switch (scope) {
    case WikiPageEventScope.ALL:
      return EVERYBODY_LABEL;

    case WikiPageEventScope.PARTICIPANTS:
      return "Eventteilnehmer";

    case WikiPageEventScope.POSITION: {
      const name = positionId ? positionNameOf(positionId) : undefined;
      /** A deleted group leaves the label nameless instead of empty */
      return name ? `Aufstellung „${name}“` : "Aufstellung";
    }

    case WikiPageEventScope.MANAGERS:
    /** Nothing to inherit from — most restrictive, like in the resolver */
    case WikiPageEventScope.INHERIT:
      return "Event-Manager";

    default:
      throw new Error(`Unexpected scope: ${scope satisfies never}`);
  }
};
