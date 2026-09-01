import { WikiPageEventScope } from "@sam-monorepo/database/browser";
import type { EventWikiScopeSelection } from "./isEventWikiScopeSubset";

/**
 * Who may read a page of the global wiki, condensed for the header badge.
 * Roles that read only because they hold `wiki;manage` deliberately do not
 * count as an audience — those read every page and say nothing about this
 * one, so they must not make a private page look shared.
 */
export interface WikiRoleReadAudience {
  /** Everybody with wiki access may read the page */
  readonly isEverybody: boolean;
  /** At least one role may read the page */
  readonly hasReadRoles: boolean;
}

/** The widest audience, worded the same in both wiki models */
const EVERYBODY_LABEL = "alle";

/**
 * The read audience of a global wiki page. The roles are neither named nor
 * counted: their names must not reach a viewer who may not browse them, and
 * a number would mislead more than it says — role inheritance and the
 * higher tiers put roles into the audience that the page itself never
 * mentions. The dialog stays the exact view.
 */
export const getWikiRoleReadAudienceLabel = ({
  isEverybody,
  hasReadRoles,
}: WikiRoleReadAudience): string => {
  if (isEverybody) return EVERYBODY_LABEL;
  return hasReadRoles ? "ausgewählte Rollen" : "nur Besitzer & Manager";
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
