import { prisma } from "@/db";
import type { WikiPageScopedContext } from "../queries/getWikiPageScopedContext";
import {
  buildWikiPageHref,
  createVariantWikiHrefMode,
  WikiScope,
} from "./wikiPageHref";

/**
 * The embed URL a mutation from inside a variant embed redirects to — or
 * null when no variant id was sent, the mutation happened outside the
 * global wiki scope, the variant id is stale/foreign, the variant lost its
 * link, or the page is not inside the linked subtree; callers then fall
 * back to the page's global URL. The target only ever derives from
 * database-validated ids, so nothing user-controlled reaches the redirect
 * (no open redirect surface).
 */
export const resolveVariantWikiRedirectHref = async (
  scoped: WikiPageScopedContext,
  variantId: string | undefined,
  page: { readonly id: string; readonly slug: string },
  /** The created/pasted page itself may not be in the context yet */
  parentId: string | null,
): Promise<string | null> => {
  if (!variantId || scoped.scope !== WikiScope.Wiki) return null;

  const variant = await prisma.variant.findUnique({
    where: { id: variantId },
    select: { id: true, wikiPageId: true },
  });
  if (!variant?.wikiPageId) return null;

  /** A replace-paste may target the linked root itself */
  if (page.id === variant.wikiPageId)
    return buildWikiPageHref(
      createVariantWikiHrefMode(variant.id, variant.wikiPageId),
      page,
    );

  const visited = new Set<string>();
  let currentId = parentId;
  while (currentId) {
    if (currentId === variant.wikiPageId)
      return buildWikiPageHref(
        createVariantWikiHrefMode(variant.id, variant.wikiPageId),
        page,
      );

    if (visited.has(currentId)) return null;
    visited.add(currentId);
    currentId = scoped.context.pagesById.get(currentId)?.parentId ?? null;
  }

  return null;
};
