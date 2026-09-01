import {
  buildWikiPageMap,
  createWikiPagePermissionResolver,
  type WikiPagePermissionSource,
} from "./resolveWikiPagePermissions.js";

export interface WikiPermissionRole {
  readonly id: string;
  /**
   * Roles a citizen holding this role effectively has: the role itself plus
   * the roles it inherits — same rule as `resolveEffectiveRoles()`, minus the
   * level check, which depends on the individual assignment.
   */
  readonly effectiveRoleIds: readonly string[];
  /** Whether the role carries the app-level `wiki;manage` permission */
  readonly hasWikiManage: boolean;
}

/**
 * Resolves the wiki permissions a citizen would have if the given role were
 * their only one. Answers "which roles may read/edit/manage this page?"
 * without expanding roles into citizens — and exactly, because permissions
 * are resolved by the very same resolver the request path uses.
 *
 * Citizen-bound grants (ownership) deliberately don't apply: the resolvers
 * run without a citizen, so ownership is reported separately by the callers.
 *
 * One resolver per role covers all pages, so asking about many pages is
 * cheap. The results describe the passed page data — rebuild the resolvers
 * after changing pages.
 */
export const createWikiPageRoleResolvers = (
  pages: readonly WikiPagePermissionSource[],
  roles: readonly WikiPermissionRole[],
) => {
  /**
   * The one place the page lookup is shared: it is identical for every role
   * and building it per resolver dominates the cost of asking about a page
   * for all roles of the org.
   */
  const pagesById = buildWikiPageMap(pages);

  return roles.map((role) => ({
    role,
    resolver: createWikiPagePermissionResolver(
      pages,
      {
        citizenId: null,
        roleIds: new Set(role.effectiveRoleIds),
        hasWikiManage: role.hasWikiManage,
      },
      pagesById,
    ),
  }));
};

/** Ids of the roles that may read the given page on their own */
export const resolveWikiPageReadRoleIds = (
  pages: readonly WikiPagePermissionSource[],
  roles: readonly WikiPermissionRole[],
  pageId: string,
) =>
  new Set(
    createWikiPageRoleResolvers(pages, roles)
      .filter(({ resolver }) => resolver.get(pageId)?.canRead)
      .map(({ role }) => role.id),
  );
