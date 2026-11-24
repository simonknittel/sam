import {
  ACTIVE_CITIZEN_WHERE,
  EFFECTIVE_ROLE_PERMISSIONS_SELECT,
  comparePermissionSets,
  getPermissionSetsByRoles,
  resolveEffectiveRoles,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { getHumanResourcesRoleIds } from "./getHumanResourcesRoleIds.js";

/**
 * The where-fragment matches a superset, because Prisma cannot compare
 * `currentLevel` with `Role.maxLevel`. The rule of the session callback (level
 * gate, inheritance, `login;negate`) applies in memory. Banned users cannot
 * sign in, thus their citizens are not listed. No permission check, see the
 * README.
 */
export const listHumanResourcesContacts = (
  context: ApplicationContext,
): Promise<string[]> =>
  withSpan(context, "listHumanResourcesContacts", async () => {
    const humanResourcesRoleIds = await getHumanResourcesRoleIds(context);
    if (humanResourcesRoleIds.length === 0) return [];

    const candidates = await context.prisma.citizen.findMany({
      where: {
        ...ACTIVE_CITIZEN_WHERE,
        handle: { not: null },
        OR: [{ user: null }, { user: { bannedAt: null } }],
        roleAssignments: {
          some: {
            role: {
              OR: [
                { id: { in: humanResourcesRoleIds } },
                { inherits: { some: { id: { in: humanResourcesRoleIds } } } },
              ],
            },
          },
        },
      },
      orderBy: [{ handle: "asc" }, { id: "asc" }],
      select: {
        handle: true,
        roleAssignments: { select: EFFECTIVE_ROLE_PERMISSIONS_SELECT },
      },
    });

    return candidates
      .filter((candidate) => {
        const effectiveRoles = resolveEffectiveRoles(candidate.roleAssignments);

        return (
          effectiveRoles.some((role) =>
            humanResourcesRoleIds.includes(role.id),
          ) &&
          comparePermissionSets(
            { resource: "login", operation: "manage" },
            getPermissionSetsByRoles(effectiveRoles),
          )
        );
      })
      .flatMap(({ handle }) => (handle ? [handle] : []));
  });
