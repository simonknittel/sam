import type {
  EventWikiContext,
  EventWikiContextPage,
} from "../queries/getEventWikiContext";
import type { WikiPageAccessTier } from "./getAccessibleWikiPage";

/**
 * The page if it exists, is not trashed and the viewer holds the tier —
 * NULL otherwise, without distinguishing why: an unknown, trashed and
 * invisible page all look the same, so existence never leaks. The
 * event-scoped counterpart of `getAccessibleWikiPage`.
 */
export const getAccessibleEventWikiPage = (
  context: EventWikiContext,
  pageId: string | null | undefined,
  tier: WikiPageAccessTier,
): EventWikiContextPage | null => {
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
