import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Roles carry a markdown description and a full icon/thumbnail relation, so an
 * `include` here drags kilobytes per assignment through the hottest permission
 * paths in the app.
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
