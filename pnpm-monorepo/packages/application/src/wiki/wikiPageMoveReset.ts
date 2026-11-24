import type { PrismaClientType } from "@sam-monorepo/database";
import {
  WikiPageEventScope,
  WikiPageUploadability,
  type Prisma,
} from "@sam-monorepo/database/client";
import {
  collectWikiPageDescendants,
  WikiScopeKind,
} from "@sam-monorepo/domain";
import type { EventWikiContextPage } from "./eventWikiContext.js";
import type { WikiContextPage } from "./wikiContext.js";
import {
  getTopLevelWikiPagePermissions,
  INHERITED_WIKI_PAGE_PERMISSIONS,
} from "./wikiPageDefaults.js";
import type { WikiPageScope } from "./wikiScope.js";

type MoveResetClient = Pick<
  PrismaClientType,
  "wikiPage" | "wikiPageRoleAccess"
>;

interface WikiPageMoveReset {
  /** The moved page and its descendants, also the descendants in the trash */
  readonly subtreeIds: string[];
  readonly statements: Prisma.PrismaPromise<unknown>[];
}

/**
 * A moved page of the global wiki and its subtree take the permissions of
 * their new place: all tiers go back to INHERIT and the role lists go away.
 * With the old settings, the page could become visible to the readers of
 * its new place, or roles that cannot read the new parent could lose their
 * access without a sign.
 *
 * A page that goes to the top level has nothing to inherit from. Thus it
 * gets the permissions of a new page at the top level: only the owner can
 * see it. The owner is its own owner, or the actor that moved it.
 */
const buildGlobalWikiPageMoveReset = (
  prisma: MoveResetClient,
  pages: readonly WikiContextPage[],
  page: WikiContextPage,
  newParentId: string | null,
  movedById: string | null,
): WikiPageMoveReset => {
  const subtreeIds = [page.id, ...collectWikiPageDescendants(pages, page.id)];
  const descendantIds = subtreeIds.filter((id) => id !== page.id);

  return {
    subtreeIds,
    statements: [
      prisma.wikiPage.update({
        where: { id: page.id },
        data: newParentId
          ? INHERITED_WIKI_PAGE_PERMISSIONS
          : getTopLevelWikiPagePermissions(page.ownerId ?? movedById),
        select: { id: true },
      }),
      ...(descendantIds.length > 0
        ? [
            prisma.wikiPage.updateMany({
              where: { id: { in: descendantIds } },
              data: INHERITED_WIKI_PAGE_PERMISSIONS,
            }),
          ]
        : []),
      prisma.wikiPageRoleAccess.deleteMany({
        where: { pageId: { in: subtreeIds } },
      }),
    ],
  };
};

/**
 * A moved page of a briefing and its subtree take the scopes and the upload
 * tiers of their new place. Here the reason is a result that the user can
 * predict, not the security: the gate of the parent already limits the
 * access of a child. But the move dialogs tell that the page takes the
 * permissions of the new parent, in both scopes. A briefing has no top level
 * to move to (the locked root page is its only top-level page).
 */
const buildBriefingPageMoveReset = (
  prisma: MoveResetClient,
  pages: readonly EventWikiContextPage[],
  pageId: string,
): WikiPageMoveReset => {
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
          imageUploadability: WikiPageUploadability.INHERIT,
          attachmentUploadability: WikiPageUploadability.INHERIT,
        },
      }),
    ],
  };
};

/**
 * The permission reset of a page that gets a new parent, the same on both
 * reparent paths (a move and a drop in the sidebar tree). Put the statements
 * before the update that sets the new parent: the database allows PUBLIC
 * only on a top-level page, and the reset removes PUBLIC from a page that
 * gets a parent.
 *
 * @param pageId A page of the scope
 */
export const buildWikiPageReparentReset = (
  prisma: MoveResetClient,
  scope: WikiPageScope,
  pageId: string,
  newParentId: string | null,
  updatedById: string | null,
): WikiPageMoveReset => {
  switch (scope.kind) {
    case WikiScopeKind.Wiki: {
      const page = scope.pagesById.get(pageId);
      if (!page) throw new Error("The moved page is missing from its scope");

      return buildGlobalWikiPageMoveReset(
        prisma,
        scope.allPages,
        page,
        newParentId,
        updatedById,
      );
    }

    case WikiScopeKind.Briefing:
      return buildBriefingPageMoveReset(prisma, scope.allPages, pageId);

    default:
      throw new Error(`Unknown wiki page scope: ${scope satisfies never}`);
  }
};
