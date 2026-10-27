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
 * visible tags into the roles context of the client on each page, like the
 * role badges.
 */
export interface RoleTagBadge {
  readonly id: string;
  readonly name: string;
  /** Plain text */
  readonly description: string | null;
  readonly icon: RoleIcon | null;
  /** The roles of the tag that the actor can see, sorted by name */
  readonly roleIds: string[];
}

/** The tag with the roles that the actor can see (see `isRoleVisible()`) */
export const toRoleTagBadge = (
  actor: Pick<Actor, "authorize">,
  tag: RoleTagBadgeRow,
): RoleTagBadge => ({
  id: tag.id,
  name: tag.name,
  description: tag.description,
  icon: tag.icon,
  roleIds: tag.roles
    .map((assignment) => assignment.role)
    .filter((role) => isRoleVisible(actor, role.id))
    .toSorted(compareRoleNames)
    .map((role) => role.id),
});

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
