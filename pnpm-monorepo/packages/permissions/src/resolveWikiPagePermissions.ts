import {
  WikiPageAccessType,
  WikiPageEditability,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/browser";
import {
  findWikiPageSettingSource,
  resolveWikiPageTier,
} from "./wikiPageHierarchy.js";

export interface WikiPagePermissionSource {
  readonly id: string;
  readonly parentId: string | null;
  /**
   * NULL means the owner is inherited from the nearest ancestor with an
   * explicit owner; NULL at the root means the page has no owner.
   */
  readonly ownerId: string | null;
  readonly visibility: WikiPageVisibility;
  readonly editability: WikiPageEditability;
  readonly imageUploadability: WikiPageUploadability;
  readonly attachmentUploadability: WikiPageUploadability;
  readonly roleAccess: readonly {
    readonly roleId: string;
    readonly type: WikiPageAccessType;
  }[];
}

/**
 * The id lookup the hierarchy walk needs. Building it is the dominant cost
 * of resolving one page for every role of the org, and it is identical for
 * all of those resolvers — so build it once and hand it to each of them.
 */
export const buildWikiPageMap = (
  pages: readonly WikiPagePermissionSource[],
): ReadonlyMap<string, WikiPagePermissionSource> =>
  new Map(pages.map((page) => [page.id, page]));

export interface WikiPageViewer {
  readonly citizenId: string | null;
  readonly roleIds: ReadonlySet<string>;
  readonly hasWikiManage: boolean;
}

/**
 * The three access tiers shared by this role-based resolver and the event
 * resolver — the subset the tree/breadcrumb/target/index utilities need, so
 * they serve both namespaces.
 */
export interface WikiPageTierPermissions {
  readonly canRead: boolean;
  readonly canEdit: boolean;
  readonly canAdmin: boolean;
}

export interface ResolvedWikiPagePermissions extends WikiPageTierPermissions {
  readonly canUploadImages: boolean;
  readonly canUploadAttachments: boolean;
  /**
   * Page whose explicit (non-INHERIT/non-null) setting supplied the
   * effective value. Equals the page's own id if it doesn't inherit. Used by
   * the permissions dialog to show where an inherited setting comes from.
   * Manage has no such source — it is additive along the whole chain.
   */
  readonly visibilitySourceId: string;
  readonly editabilitySourceId: string;
  readonly imageUploadabilitySourceId: string;
  readonly attachmentUploadabilitySourceId: string;
  readonly ownerSourceId: string;
  /** Owner after inheritance. NULL if the whole chain has no explicit owner. */
  readonly effectiveOwnerId: string | null;
}

type InheritedTier =
  | "visibility"
  | "editability"
  | "imageUploadability"
  | "attachmentUploadability"
  | "owner";

const hasExplicitSetting = (
  page: WikiPagePermissionSource,
  tier: InheritedTier,
) => {
  switch (tier) {
    case "visibility":
      return page.visibility !== WikiPageVisibility.INHERIT;
    case "editability":
      return page.editability !== WikiPageEditability.INHERIT;
    case "imageUploadability":
      return page.imageUploadability !== WikiPageUploadability.INHERIT;
    case "attachmentUploadability":
      return page.attachmentUploadability !== WikiPageUploadability.INHERIT;
    case "owner":
      return page.ownerId !== null;
    default:
      throw new Error(`Unexpected tier: ${tier satisfies never}`);
  }
};

/**
 * Nearest page with an explicit setting for the given tier, via the shared
 * hierarchy walk. The effective value of a fallback source (fully-INHERIT
 * chain, broken chain, cycle) stays INHERIT (or a null owner) and is
 * treated as most restrictive by the grant checks below.
 */
const findSource = (
  page: WikiPagePermissionSource,
  tier: InheritedTier,
  pagesById: ReadonlyMap<string, WikiPagePermissionSource>,
  cache: Map<string, WikiPagePermissionSource>,
) =>
  findWikiPageSettingSource(page, pagesById, cache, (candidate) =>
    hasExplicitSetting(candidate, tier),
  );

const hasRoleAccess = (
  page: WikiPagePermissionSource,
  type: WikiPageAccessType,
  viewer: WikiPageViewer,
) => {
  return page.roleAccess.some(
    (access) => access.type === type && viewer.roleIds.has(access.roleId),
  );
};

/**
 * Upload tiers have no role lists: RESTRICTED means effective admins only
 * (which already covers the effective owner, admin roles and `wiki;manage`),
 * EDITORS extends that to everyone with effective edit permission.
 */
const isGrantedUpload = (
  uploadability: WikiPageUploadability,
  canEdit: boolean,
  canAdmin: boolean,
) => {
  switch (uploadability) {
    case WikiPageUploadability.EDITORS:
      return canEdit;
    case WikiPageUploadability.RESTRICTED:
      return canAdmin;
    // Fallback source of a fully-INHERIT chain: like RESTRICTED
    case WikiPageUploadability.INHERIT:
      return canAdmin;
    default:
      throw new Error(
        `Unexpected uploadability: ${uploadability satisfies never}`,
      );
  }
};

/**
 * Resolves the permissions of one viewer against a set of pages, memoized
 * per page. Pass all pages of a namespace including soft-deleted ones (trash
 * restore/destroy need permissions on them); deleted ancestors still supply
 * inherited settings, resolved against the ancestor chain.
 *
 * Grant rules:
 * - `wiki;manage` grants all tiers on every page.
 * - A page grants nothing to someone who cannot read its parent. Access to
 *   a subtree is therefore always a subset of the access to the page above
 *   it, whatever the subtree defines for itself — no page can be reached
 *   without a readable path from the top level down to it.
 * - Manage is additive along the hierarchy: whoever manages a page manages
 *   its whole subtree. Owners and admin roles of an ancestor therefore keep
 *   all three tiers on every descendant, even on descendants that have an
 *   own owner or own admin roles — that is what makes handing a subtree to
 *   someone else possible without losing control over it. This does not
 *   collide with the rule above: managing a page implies reading it.
 * - Ownership itself is inherited "nearest setting wins": a page's effective
 *   owner is the nearest explicit owner up the chain, and the effective
 *   owner has all tiers on the page — as long as they may read its parent.
 *   The creator deliberately has no implicit permissions: top-level pages
 *   start with the creator as explicit owner, child pages start inheriting,
 *   and ownership is transferable, so access can be revoked when members
 *   leave or switch departments.
 * - Edit resolves "nearest setting wins" within those bounds. ALL means
 *   "everyone who may read this page", not "everyone with wiki access" — an
 *   open page below a restricted one stays as narrow as the page itself.
 * - Tiers imply the lower ones: admin ⇒ edit ⇒ read.
 * - INHERIT without a reachable parent (top-level page, broken chain, cycle)
 *   is the most restrictive value, not the most permissive one: only the
 *   effective owner and the managers get in.
 * - The upload tiers (image/attachment uploadability) are independent of
 *   each other and gate who may upload while editing: RESTRICTED = admins
 *   only, EDITORS = everyone with edit permission. Uploading implies
 *   editing — without `canEdit` there is never upload permission.
 */
export const createWikiPagePermissionResolver = (
  pages: readonly WikiPagePermissionSource[],
  viewer: WikiPageViewer,
  /**
   * The lookup of `pages` — pass a shared one where many resolvers run over
   * the same page set (see `buildWikiPageMap()`). Only the lookup is
   * shared; the caches below hold one viewer's results and stay private.
   */
  pagesById: ReadonlyMap<string, WikiPagePermissionSource> = buildWikiPageMap(
    pages,
  ),
) => {
  const visibilityCache = new Map<string, WikiPagePermissionSource>();
  const editabilityCache = new Map<string, WikiPagePermissionSource>();
  const imageUploadabilityCache = new Map<string, WikiPagePermissionSource>();
  const attachmentUploadabilityCache = new Map<
    string,
    WikiPagePermissionSource
  >();
  const ownerCache = new Map<string, WikiPagePermissionSource>();

  const adminCache = new Map<string, boolean>();
  const editCache = new Map<string, boolean>();
  const readGrantCache = new Map<string, boolean>();
  const readCache = new Map<string, boolean>();
  /**
   * Pages currently on the recursion stack, one set per tier: a tier depends
   * on the lower tiers of the same page (read on edit on admin), so a shared
   * set would mistake that for a cycle.
   */
  const adminPending = new Set<string>();
  const editPending = new Set<string>();
  const readGrantPending = new Set<string>();
  const readPending = new Set<string>();

  const parentOf = (page: WikiPagePermissionSource) =>
    page.parentId ? pagesById.get(page.parentId) : undefined;

  const effectiveOwnerIdOf = (page: WikiPagePermissionSource) =>
    findSource(page, "owner", pagesById, ownerCache).ownerId;

  const isEffectivelyOwned = (page: WikiPagePermissionSource) => {
    const effectiveOwnerId = effectiveOwnerIdOf(page);
    return Boolean(effectiveOwnerId) && effectiveOwnerId === viewer.citizenId;
  };

  /**
   * The gate every tier passes through: a page hands out nothing to someone
   * who cannot read the page above it. Top-level pages have nothing to be
   * gated by. A page whose parent is missing from the data counts as
   * top-level, matching how the inherited tiers treat a broken chain.
   */
  const isAccessible = (page: WikiPagePermissionSource) => {
    const parent = parentOf(page);
    return parent ? canReadOf(parent) : true;
  };

  const canAdminOf = (page: WikiPagePermissionSource): boolean =>
    resolveWikiPageTier(page, adminCache, adminPending, () => {
      if (viewer.hasWikiManage) return true;
      if (!isAccessible(page)) return false;
      if (isEffectivelyOwned(page)) return true;
      if (hasRoleAccess(page, WikiPageAccessType.ADMIN, viewer)) return true;

      const parent = parentOf(page);
      return parent ? canAdminOf(parent) : false;
    });

  /**
   * What the page's own visibility grants, without the "may edit ⇒ may read"
   * implication and without the parent gate. Editability ALL is defined on
   * top of it, so the two must not be expressed through each other.
   */
  const hasReadGrant = (page: WikiPagePermissionSource): boolean =>
    resolveWikiPageTier(page, readGrantCache, readGrantPending, () => {
      switch (page.visibility) {
        /**
         * PUBLIC is only allowed on top-level pages. On a child page it
         * would mean "no own restriction", which is exactly what INHERIT
         * means there — treated alike so leftover data cannot widen read
         * access.
         */
        case WikiPageVisibility.PUBLIC:
          return true;
        case WikiPageVisibility.RESTRICTED:
          return hasRoleAccess(page, WikiPageAccessType.READ, viewer);
        /** No own restriction; a top-level page has nothing to inherit */
        case WikiPageVisibility.INHERIT:
          return Boolean(parentOf(page));
        default:
          throw new Error(
            `Unexpected visibility: ${page.visibility satisfies never}`,
          );
      }
    });

  const canEditOf = (page: WikiPagePermissionSource): boolean =>
    resolveWikiPageTier(page, editCache, editPending, () => {
      if (viewer.hasWikiManage) return true;
      if (canAdminOf(page)) return true;
      if (!isAccessible(page)) return false;

      switch (page.editability) {
        case WikiPageEditability.ALL:
          return hasReadGrant(page);
        case WikiPageEditability.RESTRICTED:
          return hasRoleAccess(page, WikiPageAccessType.EDIT, viewer);
        case WikiPageEditability.INHERIT: {
          const parent = parentOf(page);
          return parent ? canEditOf(parent) : false;
        }
        default:
          throw new Error(
            `Unexpected editability: ${page.editability satisfies never}`,
          );
      }
    });

  const canReadOf = (page: WikiPagePermissionSource): boolean =>
    resolveWikiPageTier(page, readCache, readPending, () => {
      if (viewer.hasWikiManage) return true;
      if (canEditOf(page)) return true;
      return isAccessible(page) && hasReadGrant(page);
    });

  const get = (pageId: string): ResolvedWikiPagePermissions | undefined => {
    const page = pagesById.get(pageId);
    if (!page) return undefined;

    const canAdmin = canAdminOf(page);
    const canEdit = canEditOf(page);
    const canRead = canReadOf(page);

    const imageUploadabilitySource = findSource(
      page,
      "imageUploadability",
      pagesById,
      imageUploadabilityCache,
    );
    const attachmentUploadabilitySource = findSource(
      page,
      "attachmentUploadability",
      pagesById,
      attachmentUploadabilityCache,
    );
    const ownerSource = findSource(page, "owner", pagesById, ownerCache);

    return {
      canRead,
      canEdit,
      canAdmin,
      canUploadImages: isGrantedUpload(
        imageUploadabilitySource.imageUploadability,
        canEdit,
        canAdmin,
      ),
      canUploadAttachments: isGrantedUpload(
        attachmentUploadabilitySource.attachmentUploadability,
        canEdit,
        canAdmin,
      ),
      visibilitySourceId: findSource(
        page,
        "visibility",
        pagesById,
        visibilityCache,
      ).id,
      editabilitySourceId: findSource(
        page,
        "editability",
        pagesById,
        editabilityCache,
      ).id,
      imageUploadabilitySourceId: imageUploadabilitySource.id,
      attachmentUploadabilitySourceId: attachmentUploadabilitySource.id,
      ownerSourceId: ownerSource.id,
      effectiveOwnerId: ownerSource.ownerId,
    };
  };

  return { get };
};

/**
 * Resolves the effective permissions of the given viewer for every given
 * page — see `createWikiPagePermissionResolver()` for the grant rules.
 */
export const resolveWikiPagePermissions = (
  pages: readonly WikiPagePermissionSource[],
  viewer: WikiPageViewer,
) => {
  const resolver = createWikiPagePermissionResolver(pages, viewer);

  const result = new Map<string, ResolvedWikiPagePermissions>();
  for (const page of pages) {
    const permissions = resolver.get(page.id);
    if (permissions) result.set(page.id, permissions);
  }

  return result;
};
