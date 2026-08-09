import type { WikiPagePermissionSource } from "@sam-monorepo/permissions";
import {
  createWikiPageRoleResolvers,
  type WikiPermissionRole,
} from "@sam-monorepo/permissions";

export interface WikiPageRolePrune {
  readonly pageId: string;
  readonly roleIds: string[];
}

/**
 * Finds role access entries that grant nothing because the role cannot read
 * the page's parent — a page never hands out more than the page above it, so
 * such entries are dead weight that would silently come back to life if the
 * parent ever widened again. Callers delete them and report what they
 * removed. Read, edit and manage entries share the same criterion, so a
 * pruned role loses all of its entries on that page.
 *
 * Pass the page data as it will be AFTER the change that triggered this
 * (permission update, duplication) — the prunes are derived from it. A single
 * pass is enough even for deep subtrees: the resolver already requires the
 * whole ancestor chain to grant read, so an entry below a pruned one is
 * recognized as dead in the same pass.
 */
export const collectWikiPageRolePrunes = (
  pages: readonly WikiPagePermissionSource[],
  roles: readonly WikiPermissionRole[],
  pageIds: readonly string[],
): WikiPageRolePrune[] => {
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const resolvers = createWikiPageRoleResolvers(pages, roles);

  const prunes: WikiPageRolePrune[] = [];

  for (const pageId of pageIds) {
    const page = pagesById.get(pageId);
    if (!page?.parentId) continue;

    /**
     * A page whose parent is missing from the data counts as top-level in
     * the resolver, so there is nothing to narrow it against here either.
     */
    const parent = pagesById.get(page.parentId);
    if (!parent) continue;

    const roleIdsOnPage = new Set(
      page.roleAccess.map((access) => access.roleId),
    );
    if (roleIdsOnPage.size === 0) continue;

    const roleIds = resolvers
      .filter(
        ({ role, resolver }) =>
          roleIdsOnPage.has(role.id) && !resolver.get(parent.id)?.canRead,
      )
      .map(({ role }) => role.id);

    if (roleIds.length > 0) prunes.push({ pageId, roleIds });
  }

  return prunes;
};
