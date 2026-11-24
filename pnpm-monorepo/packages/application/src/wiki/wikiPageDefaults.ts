import {
  WikiPageEditability,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/client";
import type { WikiSharedContextPage } from "./wikiContext.js";

export interface WikiPagePermissionColumns {
  readonly visibility: WikiPageVisibility;
  readonly editability: WikiPageEditability;
  readonly imageUploadability: WikiPageUploadability;
  readonly attachmentUploadability: WikiPageUploadability;
  readonly ownerId: string | null;
}

/**
 * The tiers of a page below a parent: the page takes all tiers of its
 * parent. A new page below a parent also has no own owner (`ownerId: null`),
 * a moved page keeps its owner.
 */
export const INHERITED_WIKI_PAGE_PERMISSIONS = {
  visibility: WikiPageVisibility.INHERIT,
  editability: WikiPageEditability.INHERIT,
  imageUploadability: WikiPageUploadability.INHERIT,
  attachmentUploadability: WikiPageUploadability.INHERIT,
} as const satisfies Omit<WikiPagePermissionColumns, "ownerId">;

/**
 * The permissions of a page at the top of the global wiki: there is nothing
 * to inherit from, thus only the owner (and `wiki;manage`) can see the page
 * at first
 */
export const getTopLevelWikiPagePermissions = (
  ownerId: string | null,
): WikiPagePermissionColumns => ({
  visibility: WikiPageVisibility.RESTRICTED,
  editability: WikiPageEditability.RESTRICTED,
  imageUploadability: WikiPageUploadability.RESTRICTED,
  attachmentUploadability: WikiPageUploadability.RESTRICTED,
  ownerId,
});

export const getNextWikiPageSortOrder = (
  pages: readonly Pick<WikiSharedContextPage, "parentId" | "sortOrder">[],
  parentId: string | null,
) => {
  const siblings = pages.filter((page) => page.parentId === parentId);

  return siblings.length > 0
    ? Math.max(...siblings.map((page) => page.sortOrder)) + 1
    : 0;
};
