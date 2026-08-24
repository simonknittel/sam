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
const ROLE_BADGE_SELECT = {
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
 * Prefer the wrappers in `modules/roles/utils/getRoles.ts`: they apply the
 * viewer's `otherRole;read` permission, which this query does not.
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
 * The permission matrix: the role link column plus the permission strings
 * behind its checkboxes. Narrower than the badge shape on purpose — the
 * matrix is the only consumer, and it renders neither description, level
 * nor thumbnail.
 */
export const getRolesWithPermissionStrings = cache(
  withTrace("getRolesWithPermissionStrings", async () =>
    prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        icon: { select: { id: true, mimeType: true } },
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
