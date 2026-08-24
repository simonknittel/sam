import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Prisma } from "@sam-monorepo/database/client";
import { cache } from "react";

/**
 * Everything a role badge renders. The result is cached behind the app
 * layout and serialized into the client roles context on every /app page,
 * so the shape stays at badge level: no permission strings, no inherited
 * roles, and no assignment row per citizen and role.
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

export type BadgeRole = Prisma.RoleGetPayload<{
  select: typeof ROLE_BADGE_SELECT;
}>;

/**
 * Use the methods from `getRoles.ts` preferably for correct permission management.
 */
export const getRoles = cache(
  withTrace("getRoles", async () =>
    prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
      select: ROLE_BADGE_SELECT,
    }),
  ),
);

/**
 * The badge shape plus the permission strings, for the permission
 * administration surfaces that render a checkbox per role and permission.
 */
export const getRolesWithPermissionStrings = cache(
  withTrace("getRolesWithPermissionStrings", async () =>
    prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        ...ROLE_BADGE_SELECT,
        permissionStrings: { select: { permissionString: true } },
      },
    }),
  ),
);

/**
 * The role administration table: its own columns plus the two relation
 * counts it filters and sorts by. Counting in SQL keeps the assignment rows
 * of every citizen out of the page.
 */
export const getRolesForTable = cache(
  withTrace("getRolesForTable", async () =>
    prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        maxLevel: true,
        maxAgeDays: true,
        assignAfterInactiveDays: true,
        icon: { select: { id: true, mimeType: true } },
        _count: { select: { inherits: true, assignments: true } },
      },
    }),
  ),
);
