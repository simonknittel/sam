import type { WikiPageTierPermissions } from "@sam-monorepo/permissions";

export type WikiPageAccessTier = "read" | "edit" | "admin";

interface AccessiblePage {
  readonly id: string;
  readonly deletedAt: Date | null;
}

/**
 * Generic over the page type so the global and the event wiki context both
 * get their own page shape back.
 */
interface AccessibleWikiPageContext<TPage extends AccessiblePage> {
  readonly pagesById: ReadonlyMap<string, TPage>;
  readonly permissions: ReadonlyMap<string, WikiPageTierPermissions>;
}

/**
 * The page if it exists, is not trashed and the viewer holds the tier —
 * NULL otherwise, without distinguishing why: an unknown, trashed and
 * invisible page all look the same, so existence never leaks. Callers
 * needing separate missing-vs-forbidden responses keep their explicit
 * checks instead.
 */
export const getAccessibleWikiPage = <TPage extends AccessiblePage>(
  context: AccessibleWikiPageContext<TPage>,
  pageId: string | null | undefined,
  tier: WikiPageAccessTier,
): TPage | null => {
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
