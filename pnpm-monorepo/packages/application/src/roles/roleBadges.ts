import type { Prisma } from "@sam-monorepo/database/client";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { canChangeRoleAssignment } from "./roleAssignmentPermissions.js";
import { compareRoleNames, isRoleVisible } from "./roleVisibility.js";

/**
 * Everything that a role badge renders. The app caches the visible badges
 * behind its layout and sends them into the roles context of the client on
 * each page, thus the shape stays at badge level: no permission strings, no
 * inherited roles, and no assignment rows.
 */
export const ROLE_BADGE_SELECT = {
  id: true,
  name: true,
  description: true,
  maxLevel: true,
  iconId: true,
  icon: { select: { id: true, mimeType: true } },
  thumbnail: { select: { id: true, mimeType: true } },
} as const satisfies Prisma.RoleSelect;

export type RoleBadge = Prisma.RoleGetPayload<{
  select: typeof ROLE_BADGE_SELECT;
}>;

/** A role of the actor, with the level of the actor and the inherited roles */
export type OwnAssignedRoleBadge = RoleBadge & {
  /** Null for a role without levels */
  readonly currentLevel: number | null;
  /** All inherited roles, also the roles that the actor cannot see */
  readonly inherits: { id: string }[];
};

/**
 * The badges of all roles, sorted by name. The helper has no permission
 * check: its callers check their own permission (the role pages and the tag
 * pages `role;manage`, the career editor the update of the flow).
 */
export const findAllRoleBadges = (
  context: Pick<ApplicationContext, "prisma">,
): Promise<RoleBadge[]> =>
  context.prisma.role.findMany({
    orderBy: { name: "asc" },
    select: ROLE_BADGE_SELECT,
  });

/**
 * The badges of the roles that the actor can see (see `isRoleVisible()`),
 * sorted by name. The MCP tool `list_roles` uses the same rule, but its
 * output does not have the uploads that the badges render.
 */
export const findVisibleRoleBadges = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Pick<Actor, "authorize">,
): Promise<RoleBadge[]> => {
  const roles = await findAllRoleBadges(context);

  return roles
    .filter((role) => isRoleVisible(actor, role.id))
    .toSorted(compareRoleNames);
};

/**
 * The badges of the visible roles that the actor can give to a citizen or
 * take away (see `canChangeRoleAssignment()`), sorted by name
 */
export const findAssignableRoleBadges = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Pick<Actor, "authorize">,
): Promise<RoleBadge[]> => {
  const visibleRoles = await findVisibleRoleBadges(context, actor);

  return visibleRoles.filter((role) => canChangeRoleAssignment(actor, role.id));
};

/**
 * The visible roles of the actor, sorted by name. The career flows need the
 * inherited roles: a node is unlocked also when the actor has a role that
 * inherits the role of the node. Requires a citizen.
 */
export const findOwnAssignedRoleBadges = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<OwnAssignedRoleBadge[]> => {
  const citizen = requireCitizen(actor);

  const roleAssignments = await context.prisma.roleAssignment.findMany({
    where: { citizenId: citizen.id },
    select: {
      currentLevel: true,
      role: {
        select: { ...ROLE_BADGE_SELECT, inherits: { select: { id: true } } },
      },
    },
  });

  return roleAssignments
    .filter((roleAssignment) => isRoleVisible(actor, roleAssignment.role.id))
    .map(({ role, currentLevel }) => ({ ...role, currentLevel }))
    .toSorted(compareRoleNames);
};
