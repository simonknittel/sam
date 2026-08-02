import {
  WikiPageAccessType,
  WikiPageAdminability,
  WikiPageEditability,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/browser";

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
  readonly adminability: WikiPageAdminability;
  readonly imageUploadability: WikiPageUploadability;
  readonly attachmentUploadability: WikiPageUploadability;
  readonly roleAccess: readonly {
    readonly roleId: string;
    readonly type: WikiPageAccessType;
  }[];
}

export interface WikiPageViewer {
  readonly citizenId: string | null;
  readonly roleIds: ReadonlySet<string>;
  readonly hasWikiManage: boolean;
}

export interface ResolvedWikiPagePermissions {
  readonly canRead: boolean;
  readonly canEdit: boolean;
  readonly canAdmin: boolean;
  readonly canUploadImages: boolean;
  readonly canUploadAttachments: boolean;
  /**
   * Page whose explicit (non-INHERIT/non-null) setting supplied the
   * effective value. Equals the page's own id if it doesn't inherit. Used by
   * the permissions dialog to show where an inherited setting comes from.
   */
  readonly visibilitySourceId: string;
  readonly editabilitySourceId: string;
  readonly adminabilitySourceId: string;
  readonly imageUploadabilitySourceId: string;
  readonly attachmentUploadabilitySourceId: string;
  readonly ownerSourceId: string;
  /** Owner after inheritance. NULL if the whole chain has no explicit owner. */
  readonly effectiveOwnerId: string | null;
}

type PermissionTier =
  | "visibility"
  | "editability"
  | "adminability"
  | "imageUploadability"
  | "attachmentUploadability"
  | "owner";

const hasExplicitSetting = (
  page: WikiPagePermissionSource,
  tier: PermissionTier,
) => {
  switch (tier) {
    case "visibility":
      return page.visibility !== WikiPageVisibility.INHERIT;
    case "editability":
      return page.editability !== WikiPageEditability.INHERIT;
    case "adminability":
      return page.adminability !== WikiPageAdminability.INHERIT;
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
 * Walks up the ancestor chain to the nearest page with an explicit setting
 * for the given tier ("nearest setting wins"). Falls back to the last
 * reachable ancestor if the whole chain is inheriting, the chain is broken
 * or contains a cycle. The effective value of such a fallback source stays
 * INHERIT (or a null owner) and is treated as most restrictive by the grant
 * checks below.
 */
const findSource = (
  page: WikiPagePermissionSource,
  tier: PermissionTier,
  pagesById: ReadonlyMap<string, WikiPagePermissionSource>,
  cache: Map<string, WikiPagePermissionSource>,
) => {
  const chain: WikiPagePermissionSource[] = [];
  const visited = new Set<string>();
  let current: WikiPagePermissionSource | undefined = page;
  let source: WikiPagePermissionSource | undefined;

  while (current) {
    const cached = cache.get(current.id);
    if (cached) {
      source = cached;
      break;
    }

    visited.add(current.id);
    chain.push(current);

    if (hasExplicitSetting(current, tier)) {
      source = current;
      break;
    }

    const parent: WikiPagePermissionSource | undefined = current.parentId
      ? pagesById.get(current.parentId)
      : undefined;
    if (!parent || visited.has(parent.id)) {
      // Root reached while inheriting, broken chain or cycle
      source = current;
      break;
    }

    current = parent;
  }

  const result = source ?? page;
  for (const entry of chain) cache.set(entry.id, result);
  return result;
};

const hasRoleAccess = (
  source: WikiPagePermissionSource,
  type: WikiPageAccessType,
  viewer: WikiPageViewer,
) => {
  return source.roleAccess.some(
    (access) => access.type === type && viewer.roleIds.has(access.roleId),
  );
};

const isGrantedAdmin = (
  source: WikiPagePermissionSource,
  sourceIsOwned: boolean,
  viewer: WikiPageViewer,
) => {
  switch (source.adminability) {
    case WikiPageAdminability.RESTRICTED:
      return (
        sourceIsOwned || hasRoleAccess(source, WikiPageAccessType.ADMIN, viewer)
      );
    // Fallback source of a fully-INHERIT chain: like RESTRICTED with no roles
    case WikiPageAdminability.INHERIT:
      return sourceIsOwned;
    default:
      throw new Error(
        `Unexpected adminability: ${source.adminability satisfies never}`,
      );
  }
};

const isGrantedEdit = (
  source: WikiPagePermissionSource,
  sourceIsOwned: boolean,
  viewer: WikiPageViewer,
) => {
  switch (source.editability) {
    case WikiPageEditability.ALL:
      return true;
    case WikiPageEditability.RESTRICTED:
      return (
        sourceIsOwned || hasRoleAccess(source, WikiPageAccessType.EDIT, viewer)
      );
    case WikiPageEditability.INHERIT:
      return sourceIsOwned;
    default:
      throw new Error(
        `Unexpected editability: ${source.editability satisfies never}`,
      );
  }
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

const isGrantedRead = (
  source: WikiPagePermissionSource,
  sourceIsOwned: boolean,
  viewer: WikiPageViewer,
) => {
  switch (source.visibility) {
    case WikiPageVisibility.PUBLIC:
      return true;
    case WikiPageVisibility.RESTRICTED:
      return (
        sourceIsOwned || hasRoleAccess(source, WikiPageAccessType.READ, viewer)
      );
    case WikiPageVisibility.INHERIT:
      return sourceIsOwned;
    default:
      throw new Error(
        `Unexpected visibility: ${source.visibility satisfies never}`,
      );
  }
};

/**
 * Resolves the effective permissions of the given viewer for every given
 * page. Pass all pages of a namespace including soft-deleted ones (trash
 * restore/destroy need permissions on them); deleted ancestors still supply
 * inherited settings, resolved against the ancestor chain.
 *
 * Grant rules:
 * - `wiki;manage` grants all tiers on every page.
 * - Ownership is inherited like the permission tiers: a page's effective
 *   owner is the nearest explicit owner up the chain. The effective owner
 *   always has all tiers on the page. The creator deliberately has no
 *   implicit permissions: top-level pages start with the creator as
 *   explicit owner, child pages start inheriting, and ownership is
 *   transferable, so access can be revoked when members leave or switch
 *   departments.
 * - RESTRICTED implicitly includes the effective owner of the page defining
 *   the setting, so a "private" page is RESTRICTED with an empty role list
 *   and subtree owners keep access to descendants even if those have a
 *   different explicit owner.
 * - Tiers imply the lower ones: admin ⇒ edit ⇒ read.
 * - The upload tiers (image/attachment uploadability) are independent of
 *   each other and gate who may upload while editing: RESTRICTED = admins
 *   only, EDITORS = everyone with edit permission. Uploading implies
 *   editing — without `canEdit` there is never upload permission.
 */
export const resolveWikiPagePermissions = (
  pages: readonly WikiPagePermissionSource[],
  viewer: WikiPageViewer,
) => {
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const visibilityCache = new Map<string, WikiPagePermissionSource>();
  const editabilityCache = new Map<string, WikiPagePermissionSource>();
  const adminabilityCache = new Map<string, WikiPagePermissionSource>();
  const imageUploadabilityCache = new Map<string, WikiPagePermissionSource>();
  const attachmentUploadabilityCache = new Map<
    string,
    WikiPagePermissionSource
  >();
  const ownerCache = new Map<string, WikiPagePermissionSource>();

  const effectiveOwnerIdOf = (page: WikiPagePermissionSource) =>
    findSource(page, "owner", pagesById, ownerCache).ownerId;

  const isEffectivelyOwned = (page: WikiPagePermissionSource) => {
    const effectiveOwnerId = effectiveOwnerIdOf(page);
    return Boolean(effectiveOwnerId) && effectiveOwnerId === viewer.citizenId;
  };

  const result = new Map<string, ResolvedWikiPagePermissions>();

  for (const page of pages) {
    const visibilitySource = findSource(
      page,
      "visibility",
      pagesById,
      visibilityCache,
    );
    const editabilitySource = findSource(
      page,
      "editability",
      pagesById,
      editabilityCache,
    );
    const adminabilitySource = findSource(
      page,
      "adminability",
      pagesById,
      adminabilityCache,
    );
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

    let canRead = false;
    let canEdit = false;
    let canAdmin = false;

    if (viewer.hasWikiManage || isEffectivelyOwned(page)) {
      canRead = true;
      canEdit = true;
      canAdmin = true;
    } else {
      canAdmin = isGrantedAdmin(
        adminabilitySource,
        isEffectivelyOwned(adminabilitySource),
        viewer,
      );
      canEdit =
        canAdmin ||
        isGrantedEdit(
          editabilitySource,
          isEffectivelyOwned(editabilitySource),
          viewer,
        );
      canRead =
        canEdit ||
        isGrantedRead(
          visibilitySource,
          isEffectivelyOwned(visibilitySource),
          viewer,
        );
    }

    result.set(page.id, {
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
      visibilitySourceId: visibilitySource.id,
      editabilitySourceId: editabilitySource.id,
      adminabilitySourceId: adminabilitySource.id,
      imageUploadabilitySourceId: imageUploadabilitySource.id,
      attachmentUploadabilitySourceId: attachmentUploadabilitySource.id,
      ownerSourceId: ownerSource.id,
      effectiveOwnerId: ownerSource.ownerId,
    });
  }

  return result;
};
