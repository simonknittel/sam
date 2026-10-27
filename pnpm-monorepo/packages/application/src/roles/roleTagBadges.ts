import type { Prisma } from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import type { RoleIcon } from "./roleAdministrationRows.js";
import { compareRoleNames, isRoleVisible } from "./roleVisibility.js";

export const ROLE_TAG_BADGE_SELECT = {
  id: true,
  name: true,
  description: true,
  icon: { select: { id: true, mimeType: true } },
  roles: { select: { role: { select: { id: true, name: true } } } },
} as const satisfies Prisma.RoleTagSelect;

export type RoleTagBadgeRow = Prisma.RoleTagGetPayload<{
  select: typeof ROLE_TAG_BADGE_SELECT;
}>;

/**
 * Everything that the tag row of the role picker renders. The app sends the
 * tags into the roles context of the client on each page, like the role
 * badges (see `findPickerRoleTagBadges()`).
 */
export interface RoleTagBadge {
  readonly id: string;
  readonly name: string;
  /** Plain text */
  readonly description: string | null;
  readonly icon: RoleIcon | null;
  /**
   * The roles of the tag that the actor can see, sorted by name. In the
   * roles context of a user with `role;manage`, all roles of the tag.
   */
  readonly roleIds: string[];
}

/** The tag with only the roles that pass the filter */
const toRoleTagBadgeWithRoles = (
  tag: RoleTagBadgeRow,
  includesRole: (roleId: string) => boolean,
): RoleTagBadge => ({
  id: tag.id,
  name: tag.name,
  description: tag.description,
  icon: tag.icon,
  roleIds: tag.roles
    .map((assignment) => assignment.role)
    .filter((role) => includesRole(role.id))
    .toSorted(compareRoleNames)
    .map((role) => role.id),
});

/** The tag with the roles that the actor can see (see `isRoleVisible()`) */
export const toRoleTagBadge = (
  actor: Pick<Actor, "authorize">,
  tag: RoleTagBadgeRow,
): RoleTagBadge =>
  toRoleTagBadgeWithRoles(tag, (roleId) => isRoleVisible(actor, roleId));

/**
 * Whether the actor can see the tag: a user sees a tag only if the user sees
 * at least one of its roles. With `role;manage`, the user sees all tags, also
 * the tags without roles.
 */
const isRoleTagVisible = (actor: Pick<Actor, "authorize">, tag: RoleTagBadge) =>
  tag.roleIds.length > 0 || actor.authorize("role", "manage");

/**
 * The tags that the actor can see (see `isRoleTagVisible()`), sorted by name
 * like the tag row of the role picker
 */
export const findVisibleRoleTagBadges = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Pick<Actor, "authorize">,
): Promise<RoleTagBadge[]> => {
  const tags = await context.prisma.roleTag.findMany({
    select: ROLE_TAG_BADGE_SELECT,
  });

  return tags
    .map((tag) => toRoleTagBadge(actor, tag))
    .filter((tag) => isRoleTagVisible(actor, tag))
    .toSorted(compareRoleNames);
};

/**
 * The tags of the roles context of the app, sorted by name. The role pickers
 * of the role pages and of the tag page offer all roles to a user with
 * `role;manage`, thus this user gets all tags with all of their roles: a
 * click on a tag also selects the roles that the user cannot see. The other
 * users get the visible tags (see `findVisibleRoleTagBadges()`).
 */
export const findPickerRoleTagBadges = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Pick<Actor, "authorize">,
): Promise<RoleTagBadge[]> => {
  if (!actor.authorize("role", "manage"))
    return findVisibleRoleTagBadges(context, actor);

  const tags = await context.prisma.roleTag.findMany({
    select: ROLE_TAG_BADGE_SELECT,
  });

  return tags
    .map((tag) => toRoleTagBadgeWithRoles(tag, () => true))
    .toSorted(compareRoleNames);
};
