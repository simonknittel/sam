import type { Prisma } from "@sam-monorepo/database/client";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import type { RoleIcon } from "./roleAdministrationRows.js";
import { ROLE_BADGE_SELECT } from "./roleBadges.js";
import {
  ROLE_TAG_BADGE_SELECT,
  type RoleTagBadgeRow,
} from "./roleTagBadges.js";
import { compareRoleNames } from "./roleVisibility.js";

const MANAGED_ROLE_SELECT = {
  ...ROLE_BADGE_SELECT,
  maxAgeDays: true,
  assignAfterInactiveDays: true,
  thumbnailId: true,
  permissionStrings: { select: { permissionString: true } },
  inherits: { select: { id: true } },
  tags: { select: { tagId: true } },
} as const satisfies Prisma.RoleSelect;

/** A role with the fields that the role pages edit */
export type ManagedRole = Prisma.RoleGetPayload<{
  select: typeof MANAGED_ROLE_SELECT;
}>;

/**
 * The role for the role pages, or null when it does not exist. Requires
 * `role;manage`.
 */
export const findManagedRole = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  roleId: string,
): Promise<ManagedRole | null> => {
  requirePermission(actor, "role", "manage");

  return context.prisma.role.findUnique({
    where: { id: roleId },
    select: MANAGED_ROLE_SELECT,
  });
};

/** A tag with the fields that the tag pages of the IAM app edit */
export interface ManagedRoleTag {
  readonly id: string;
  readonly name: string;
  /** Plain text */
  readonly description: string | null;
  readonly icon: RoleIcon | null;
  /**
   * All roles of the tag, sorted by name. The tag outputs give only the roles
   * that the actor can see, but the tag page saves the full list: a role
   * that is not in the list loses the tag.
   */
  readonly roleIds: string[];
}

export const toManagedRoleTag = (tag: RoleTagBadgeRow): ManagedRoleTag => ({
  id: tag.id,
  name: tag.name,
  description: tag.description,
  icon: tag.icon,
  roleIds: tag.roles
    .map((assignment) => assignment.role)
    .toSorted(compareRoleNames)
    .map((role) => role.id),
});

/**
 * The tag for the tag page, or null when it does not exist. Requires
 * `role;manage`.
 */
export const findManagedRoleTag = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  tagId: string,
): Promise<ManagedRoleTag | null> => {
  requirePermission(actor, "role", "manage");

  const tag = await context.prisma.roleTag.findUnique({
    where: { id: tagId },
    select: ROLE_TAG_BADGE_SELECT,
  });

  return tag ? toManagedRoleTag(tag) : null;
};
