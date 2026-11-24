import { WikiPageEventScope } from "@sam-monorepo/database/browser";
import type { EventWikiScopeSelection } from "@sam-monorepo/domain";

/**
 * Roles that read only because they hold `wiki;manage` do not count, see
 * `resolveWikiPageReadAudience()`
 */
export interface WikiRoleReadAudience {
  readonly isEverybody: boolean;
  readonly hasReadRoles: boolean;
}

/** The widest audience, worded the same in both wiki models */
const EVERYBODY_LABEL = "alle";

/**
 * The roles are neither named nor counted: their names must not reach a viewer
 * who may not browse them, and a number would mislead more than it says — role
 * inheritance and the higher tiers put roles into the audience that the page
 * itself never mentions. The dialog stays the exact view.
 */
export const getWikiRoleReadAudienceLabel = ({
  isEverybody,
  hasReadRoles,
}: WikiRoleReadAudience): string => {
  if (isEverybody) return EVERYBODY_LABEL;
  return hasReadRoles ? "ausgewählte Rollen" : "nur Besitzer & Manager";
};

/**
 * Takes the page's effective read scope, so `getEffectiveEventWikiScope()`
 * resolves the inheritance first
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
