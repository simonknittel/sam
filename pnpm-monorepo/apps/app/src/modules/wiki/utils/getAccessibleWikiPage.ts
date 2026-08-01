import type { WikiContext, WikiContextPage } from "../queries/getWikiContext";

export type WikiPageAccessTier = "read" | "edit" | "admin";

/**
 * The page if it exists, is not trashed and the viewer holds the tier —
 * NULL otherwise, without distinguishing why: an unknown, trashed and
 * invisible page all look the same, so existence never leaks. Callers
 * needing separate missing-vs-forbidden responses keep their explicit
 * checks instead.
 */
export const getAccessibleWikiPage = (
  context: WikiContext,
  pageId: string | null | undefined,
  tier: WikiPageAccessTier,
): WikiContextPage | null => {
  if (!pageId) return null;
  const page = context.pagesById.get(pageId);
  if (!page || page.deletedAt) return null;

  const permissions = context.permissions.get(page.id);
  const allowed =
    tier === "read"
      ? permissions?.canRead
      : tier === "edit"
        ? permissions?.canEdit
        : permissions?.canAdmin;
  return allowed ? page : null;
};
