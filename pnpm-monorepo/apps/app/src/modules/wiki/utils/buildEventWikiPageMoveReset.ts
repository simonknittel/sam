import { prisma } from "@/db";
import { WikiPageEventScope } from "@sam-monorepo/database/client";
import { collectWikiPageDescendants } from "./collectWikiPageDescendants";

/**
 * The event-mode counterpart of `buildWikiPageMoveReset`: a moved page and
 * its subtree take the scopes of their new place. Unlike the role model
 * this is about predictability, not security — the parent-read gate already
 * bounds a child's effective access — but the move dialogs promise "takes
 * on the new parent's permissions" and both modes should keep it. Top-level
 * moves cannot occur in an event wiki (the locked root is the only
 * top-level page), so there is no defaults branch.
 */
export const buildEventWikiPageMoveReset = (
  pages: readonly { id: string; parentId: string | null }[],
  pageId: string,
) => {
  const subtreeIds = [pageId, ...collectWikiPageDescendants(pages, pageId)];

  return {
    subtreeIds,
    statements: [
      prisma.wikiPage.updateMany({
        where: { id: { in: subtreeIds } },
        data: {
          eventReadScope: WikiPageEventScope.INHERIT,
          eventReadScopePositionId: null,
          eventEditScope: WikiPageEventScope.INHERIT,
          eventEditScopePositionId: null,
        },
      }),
    ],
  };
};
