import { collectWikiPageAncestors, WikiScopeKind } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import type { WikiPageScope } from "./wikiScope.js";

/**
 * For the redirect of a write from inside the embed. With null, the caller
 * uses the usual route of the page. The answer comes only from stored ids,
 * thus no user input reaches the redirect.
 *
 * @param parentId The parent of the page: a new page is not in the scope yet
 */
export const findVariantWikiRootPageId = async (
  context: Pick<ApplicationContext, "prisma">,
  scope: WikiPageScope,
  variantId: string,
  pageId: string,
  parentId: string | null,
): Promise<string | null> => {
  if (scope.kind !== WikiScopeKind.Wiki) return null;

  const variant = await context.prisma.variant.findUnique({
    where: { id: variantId },
    select: { wikiPageId: true },
  });
  const rootPageId = variant?.wikiPageId;
  if (!rootPageId) return null;

  /** A paste that replaces a page can replace the linked page itself */
  if (pageId === rootPageId) return rootPageId;

  return collectWikiPageAncestors(scope.pagesById, {
    id: pageId,
    parentId,
  }).includes(rootPageId)
    ? rootPageId
    : null;
};
