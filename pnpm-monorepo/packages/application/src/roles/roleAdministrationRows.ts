import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { toManagedRoleTag, type ManagedRoleTag } from "./findManagedRole.js";
import { ROLE_TAG_BADGE_SELECT } from "./roleTagBadges.js";
import { compareRoleNames } from "./roleVisibility.js";

export interface RoleIcon {
  readonly id: string;
  readonly mimeType: string;
}

/** A row of the permission matrix */
export interface PermissionMatrixRole {
  readonly id: string;
  readonly name: string;
  readonly icon: RoleIcon | null;
  readonly permissionStrings: string[];
}

/** A row and a column of the inheritance matrix */
export interface InheritanceMatrixRole {
  readonly id: string;
  readonly name: string;
  readonly icon: RoleIcon | null;
  readonly inheritedRoleIds: string[];
}

/** A row of the role administration table */
export interface RoleTableRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly maxLevel: number | null;
  readonly maxAgeDays: number | null;
  readonly assignAfterInactiveDays: number | null;
  readonly icon: RoleIcon | null;
  readonly inheritanceCount: number;
  /** Only the active citizens */
  readonly citizenCount: number;
  /** All tags of the role */
  readonly tagIds: string[];
}

const ICON_SELECT = { select: { id: true, mimeType: true } } as const;

/**
 * All roles with their permission strings, sorted by name. Requires
 * `role;manage`.
 */
export const findPermissionMatrixRoles = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<PermissionMatrixRole[]> => {
  requirePermission(actor, "role", "manage");

  const roles = await context.prisma.role.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      icon: ICON_SELECT,
      permissionStrings: { select: { permissionString: true } },
    },
  });

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    icon: role.icon,
    permissionStrings: role.permissionStrings.map(
      (permissionString) => permissionString.permissionString,
    ),
  }));
};

/**
 * All roles with the ids of the roles that they inherit, sorted by name.
 * One list gives the rows and the columns, thus both axes have the same
 * order. Requires `role;manage`.
 */
export const findInheritanceMatrixRoles = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<InheritanceMatrixRole[]> => {
  requirePermission(actor, "role", "manage");

  const roles = await context.prisma.role.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      icon: ICON_SELECT,
      inherits: { select: { id: true } },
    },
  });

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    icon: role.icon,
    inheritedRoleIds: role.inherits.map((inheritedRole) => inheritedRole.id),
  }));
};

/**
 * All roles with the two counts that the table filters and sorts by,
 * sorted by name. The database counts, thus the assignment rows stay out of
 * the page. Requires `role;manage`.
 */
export const findRoleTableRows = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<RoleTableRow[]> => {
  requirePermission(actor, "role", "manage");

  const roles = await context.prisma.role.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      maxLevel: true,
      maxAgeDays: true,
      assignAfterInactiveDays: true,
      icon: ICON_SELECT,
      _count: {
        select: {
          inherits: true,
          assignments: { where: { citizen: ACTIVE_CITIZEN_WHERE } },
        },
      },
      tags: { select: { tagId: true } },
    },
  });

  return roles.map(({ _count, tags, ...role }) => ({
    ...role,
    inheritanceCount: _count.inherits,
    citizenCount: _count.assignments,
    tagIds: tags.map((assignment) => assignment.tagId),
  }));
};

/**
 * All tags with all of their roles (see `ManagedRoleTag`), sorted by name
 * like the tag row of the role picker. Requires `role;manage`.
 */
export const findManagedRoleTags = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<ManagedRoleTag[]> => {
  requirePermission(actor, "role", "manage");

  const tags = await context.prisma.roleTag.findMany({
    select: ROLE_TAG_BADGE_SELECT,
  });

  return tags.map(toManagedRoleTag).toSorted(compareRoleNames);
};
