import { prisma } from "@/db";
import {
  WikiPageEditability,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/client";
import { collectWikiPageDescendants } from "./collectWikiPageDescendants";

interface MovedPage {
  readonly id: string;
  readonly ownerId: string | null;
}

/**
 * A moved page and its subtree take the permissions of their new place: all
 * tiers go back to inherited and the role lists are dropped. Carrying the old
 * settings over would either leak the page into its new surroundings or
 * quietly strip access from roles that cannot read the new parent — and the
 * page's own owner would keep rights the new location may not grant.
 *
 * A page moved to the top level has nothing to inherit from, so it gets the
 * defaults of a newly created top-level page: restricted, without roles and
 * owned by whoever moved it (unless it already has an explicit owner).
 */
export const buildWikiPageMoveReset = (
  pages: readonly { id: string; parentId: string | null }[],
  page: MovedPage,
  newParentId: string | null,
  movedById: string | null,
) => {
  const subtreeIds = [
    page.id,
    ...collectWikiPageDescendants(pages, page.id),
  ];
  const descendantIds = subtreeIds.filter((id) => id !== page.id);

  const inherited = {
    visibility: WikiPageVisibility.INHERIT,
    editability: WikiPageEditability.INHERIT,
    imageUploadability: WikiPageUploadability.INHERIT,
    attachmentUploadability: WikiPageUploadability.INHERIT,
  };

  return {
    subtreeIds,
    statements: [
      prisma.wikiPage.update({
        where: { id: page.id },
        data: newParentId
          ? inherited
          : {
              visibility: WikiPageVisibility.RESTRICTED,
              editability: WikiPageEditability.RESTRICTED,
              imageUploadability: WikiPageUploadability.RESTRICTED,
              attachmentUploadability: WikiPageUploadability.RESTRICTED,
              ownerId: page.ownerId ?? movedById,
            },
      }),
      ...(descendantIds.length > 0
        ? [
            prisma.wikiPage.updateMany({
              where: { id: { in: descendantIds } },
              data: inherited,
            }),
          ]
        : []),
      prisma.wikiPageRoleAccess.deleteMany({
        where: { pageId: { in: subtreeIds } },
      }),
    ],
  };
};
