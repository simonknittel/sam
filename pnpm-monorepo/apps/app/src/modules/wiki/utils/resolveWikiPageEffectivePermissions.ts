import { WikiPageAccessType } from "@sam-monorepo/database/browser";
import {
  buildWikiPageMap,
  createWikiPagePermissionResolver,
  createWikiPageRoleResolvers,
  type WikiPagePermissionSource,
  type WikiPermissionRole,
} from "@sam-monorepo/permissions";
import type { WikiRoleReadAudience } from "./wikiReadAudienceLabel";

export interface WikiEffectivePermissionEntry {
  /** Rendered as a role badge; without it `label` is rendered as plain text */
  readonly roleId?: string;
  readonly label?: string;
  /** Why this entry has the permission, e.g. `über Bearbeiten` */
  readonly note?: string;
}

export interface WikiEffectivePermissions {
  readonly read: WikiEffectivePermissionEntry[];
  readonly edit: WikiEffectivePermissionEntry[];
  /**
   * Managers that apply no matter what this page defines: its effective
   * owner, the manager roles of its ancestors and the roles carrying
   * `wiki;manage`.
   */
  readonly inheritedAdmin: WikiEffectivePermissionEntry[];
  /** The same read audience, condensed for the header badge */
  readonly readAudience: WikiRoleReadAudience;
}

interface Options {
  /** Handle of the effective owner, without the `@` */
  readonly ownerHandle: string | null;
  /** Title of the page supplying the owner, if it is inherited */
  readonly ownerInheritedFrom?: string;
  readonly titleOf: (pageId: string) => string | undefined;
}

const WIKI_MANAGE_NOTE = "Wiki-Management";

/**
 * Walks up from the page to the nearest ancestor granting the role manage
 * permission, which is where the role's manage permission on this page comes
 * from. Returns undefined if no ancestor does.
 */
const findInheritedAdminSource = (
  page: WikiPagePermissionSource,
  role: WikiPermissionRole,
  pagesById: ReadonlyMap<string, WikiPagePermissionSource>,
) => {
  const visited = new Set([page.id]);
  let current = page.parentId ? pagesById.get(page.parentId) : undefined;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);

    const granted = current.roleAccess.some(
      (access) =>
        access.type === WikiPageAccessType.ADMIN &&
        role.effectiveRoleIds.includes(access.roleId),
    );
    if (granted) return current;

    current = current.parentId ? pagesById.get(current.parentId) : undefined;
  }

  return undefined;
};

/**
 * Builds the "who can actually do this here?" lists shown in the permissions
 * dialog, as roles instead of citizens: role memberships are deliberately
 * not expanded, the owner is the only individual and appears as its own
 * entry.
 *
 * Permissions granted by a higher tier are listed too — the read list would
 * otherwise understate who sees the page — and carry a note saying where
 * they come from. When everybody with wiki access has a tier, the list
 * collapses to a single entry saying so instead of repeating every role.
 */
export const resolveWikiPageEffectivePermissions = (
  pages: readonly WikiPagePermissionSource[],
  roles: readonly WikiPermissionRole[],
  pageId: string,
  { ownerHandle, ownerInheritedFrom, titleOf }: Options,
): WikiEffectivePermissions => {
  const pagesById = buildWikiPageMap(pages);
  const page = pagesById.get(pageId);
  if (!page)
    return {
      read: [],
      edit: [],
      inheritedAdmin: [],
      readAudience: { isEverybody: false, roleCount: 0 },
    };

  /** A citizen without any role and without ownership */
  const anyone = createWikiPagePermissionResolver(
    pages,
    { citizenId: null, roleIds: new Set(), hasWikiManage: false },
    pagesById,
  ).get(pageId);

  const ownerEntry: WikiEffectivePermissionEntry | undefined = ownerHandle
    ? {
        label: `Besitzer (@${ownerHandle})`,
        note: ownerInheritedFrom ? `von "${ownerInheritedFrom}"` : undefined,
      }
    : undefined;

  const read: WikiEffectivePermissionEntry[] = [];
  const edit: WikiEffectivePermissionEntry[] = [];
  const inheritedAdmin: WikiEffectivePermissionEntry[] = [];

  if (ownerEntry) {
    read.push(ownerEntry);
    edit.push(ownerEntry);
    inheritedAdmin.push(ownerEntry);
  }

  for (const { role, resolver } of createWikiPageRoleResolvers(
    pages,
    roles,
    pagesById,
  )) {
    const permissions = resolver.get(pageId);
    if (!permissions) continue;

    const manageNote = role.hasWikiManage ? WIKI_MANAGE_NOTE : undefined;

    if (permissions.canAdmin) {
      const ownGrant = page.roleAccess.some(
        (access) =>
          access.type === WikiPageAccessType.ADMIN &&
          role.effectiveRoleIds.includes(access.roleId),
      );
      if (!ownGrant) {
        const source = findInheritedAdminSource(page, role, pagesById);
        const sourceTitle = source ? titleOf(source.id) : undefined;
        inheritedAdmin.push({
          roleId: role.id,
          note:
            manageNote ?? (sourceTitle ? `von "${sourceTitle}"` : undefined),
        });
      }
    }

    if (!anyone?.canEdit && permissions.canEdit) {
      const inheritedFrom =
        permissions.editabilitySourceId === pageId
          ? undefined
          : titleOf(permissions.editabilitySourceId);
      edit.push({
        roleId: role.id,
        note: permissions.canAdmin
          ? (manageNote ?? "über Verwalten")
          : inheritedFrom
            ? `geerbt von "${inheritedFrom}"`
            : undefined,
      });
    }

    if (!anyone?.canRead && permissions.canRead) {
      const inheritedFrom =
        permissions.visibilitySourceId === pageId
          ? undefined
          : titleOf(permissions.visibilitySourceId);
      read.push({
        roleId: role.id,
        note: permissions.canAdmin
          ? (manageNote ?? "über Verwalten")
          : permissions.canEdit
            ? "über Bearbeiten"
            : inheritedFrom
              ? `geerbt von "${inheritedFrom}"`
              : undefined,
      });
    }
  }

  return {
    read: anyone?.canRead ? [{ label: "Alle mit Wiki-Zugriff" }] : read,
    edit: anyone?.canEdit ? [{ label: "Alle mit Wiki-Zugriff" }] : edit,
    inheritedAdmin,
    readAudience: {
      isEverybody: anyone?.canRead === true,
      roleCount: countReadRolesWithoutWikiManage(
        pages,
        roles,
        pageId,
        pagesById,
      ),
    },
  };
};

/**
 * Roles that read the page for a reason this page can influence. Roles
 * holding `wiki;manage` read every page, so counting them would hide
 * exactly the difference the badge exists to show — a restricted page would
 * never fall below their number. The exclusion goes by the source of the
 * access, not by the role: whoever also has explicit access here is counted
 * again. The `Wiki-Management` note above is no substitute, because a role
 * carries it even when it has such explicit access.
 */
const countReadRolesWithoutWikiManage = (
  pages: readonly WikiPagePermissionSource[],
  roles: readonly WikiPermissionRole[],
  pageId: string,
  pagesById: ReadonlyMap<string, WikiPagePermissionSource>,
) =>
  createWikiPageRoleResolvers(
    pages,
    roles.map((role) => ({ ...role, hasWikiManage: false })),
    pagesById,
  ).filter(({ resolver }) => resolver.get(pageId)?.canRead).length;
