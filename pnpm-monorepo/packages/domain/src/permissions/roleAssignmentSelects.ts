import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Role assignments as `resolveEffectiveRoles()` needs them: the level gate
 * (`currentLevel` against `Role.maxLevel`) and the inherited role ids. Used
 * by every viewer that only derives effective role ids — the event, event
 * template, career flow and wiki contexts.
 *
 * Roles carry a markdown description and a full icon/thumbnail relation, so
 * an `include` here drags kilobytes per assignment through the hottest
 * permission paths in the app.
 */
export const EFFECTIVE_ROLE_IDS_SELECT = {
  currentLevel: true,
  role: {
    select: {
      id: true,
      maxLevel: true,
      inherits: { select: { id: true } },
    },
  },
} as const satisfies Prisma.RoleAssignmentSelect;

/**
 * The same shape plus the permission strings of the assigned and the
 * inherited roles, for the viewers that also resolve permission sets
 * through `getPermissionSetsByRoles()`: the session callback, the wiki
 * viewer of another citizen and the Lambda's citizen grants.
 *
 * Inherited roles are not level-gated, so they need no `maxLevel`.
 */
export const EFFECTIVE_ROLE_PERMISSIONS_SELECT = {
  currentLevel: true,
  role: {
    select: {
      id: true,
      maxLevel: true,
      permissionStrings: { select: { permissionString: true } },
      inherits: {
        select: {
          id: true,
          permissionStrings: { select: { permissionString: true } },
        },
      },
    },
  },
} as const satisfies Prisma.RoleAssignmentSelect;
