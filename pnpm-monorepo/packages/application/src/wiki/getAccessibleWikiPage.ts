import type { WikiPageTierPermissions } from "@sam-monorepo/domain";
import type {
  EventWikiContext,
  EventWikiContextPage,
} from "./eventWikiContext.js";
import type { VariantWikiContext } from "./variantWikiContext.js";
import type {
  WikiContext,
  WikiContextPage,
  WikiSharedContextPage,
} from "./wikiContext.js";
import type { WikiScope } from "./wikiScope.js";

export enum WikiPageAccessTier {
  Read = "read",
  Edit = "edit",
  Admin = "admin",
}

export const hasWikiPageTier = (
  permissions: WikiPageTierPermissions | undefined,
  tier: WikiPageAccessTier,
) => {
  switch (tier) {
    case WikiPageAccessTier.Read:
      return permissions?.canRead === true;

    case WikiPageAccessTier.Edit:
      return permissions?.canEdit === true;

    case WikiPageAccessTier.Admin:
      return permissions?.canAdmin === true;

    default:
      throw new Error(`Unknown wiki page access tier: ${tier satisfies never}`);
  }
};

/**
 * The page if it exists, is not in the trash and the actor holds the tier,
 * else null. The reason is not given: an unknown page, a page in the trash
 * and a page that the actor cannot see look the same, thus the existence of
 * a page never leaks. A scope of one kind gives the page type of that kind.
 */
export function getAccessibleWikiPage(
  scope: WikiContext | VariantWikiContext,
  pageId: string | null | undefined,
  tier: WikiPageAccessTier,
): WikiContextPage | null;
export function getAccessibleWikiPage(
  scope: EventWikiContext,
  pageId: string | null | undefined,
  tier: WikiPageAccessTier,
): EventWikiContextPage | null;
export function getAccessibleWikiPage(
  scope: WikiScope,
  pageId: string | null | undefined,
  tier: WikiPageAccessTier,
): WikiSharedContextPage | null;
export function getAccessibleWikiPage(
  scope: WikiScope,
  pageId: string | null | undefined,
  tier: WikiPageAccessTier,
): WikiSharedContextPage | null {
  if (!pageId) return null;

  const page = scope.pagesById.get(pageId);
  if (!page || page.deletedAt) return null;

  return hasWikiPageTier(scope.permissions.get(page.id), tier) ? page : null;
}
