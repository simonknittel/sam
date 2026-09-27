import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Role assignments as `resolveEffectiveRoles()` and
 * `getPermissionSetsByRoles()` need them: the level gate (`currentLevel`
 * against `Role.maxLevel`), the inherited roles and the permission strings
 * of both. Used by the per-request loader of the app (`getEffectiveRoles()`)
 * and by the Lambda's permission checks of notification recipients.
 *
 * Roles carry a markdown description and a full icon/thumbnail relation, so
 * an `include` here drags kilobytes per assignment through the hottest
 * permission paths in the app.
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
