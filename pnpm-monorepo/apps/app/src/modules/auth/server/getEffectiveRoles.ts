import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Citizen, RoleAssignment } from "@sam-monorepo/database/client";
import { EFFECTIVE_ROLE_PERMISSIONS_SELECT } from "@sam-monorepo/domain";
import {
  getPermissionSetsByRoles,
  resolveEffectiveRoles,
  type PermissionSet,
} from "@sam-monorepo/permissions";
import { cache } from "react";

export interface EffectiveRoles {
  /**
   * The assigned roles that pass the level gate, and the roles that they
   * inherit
   */
  readonly roleIds: ReadonlySet<string>;
  readonly permissionSets: PermissionSet[];
  /**
   * All assignments with their levels, also the assignments below the
   * maximum level. Only the session reads them.
   */
  readonly roleAssignments: readonly Pick<
    RoleAssignment,
    "roleId" | "currentLevel"
  >[];
}

/**
 * Loads the role assignments of a citizen one time for each request. The
 * session callback calls it first, thus the viewers of the wiki, the career
 * flows, the events, the event templates and the tasks get the same roles
 * without a query of their own.
 *
 * React `cache` keeps the result only while React renders. A server action
 * or a route handler makes a new query for each call.
 */
export const getEffectiveRoles = cache(
  withTrace(
    "getEffectiveRoles",
    async (citizenId: Citizen["id"]): Promise<EffectiveRoles> => {
      const roleAssignments = await prisma.roleAssignment.findMany({
        where: { citizenId },
        select: EFFECTIVE_ROLE_PERMISSIONS_SELECT,
      });

      const effectiveRoles = resolveEffectiveRoles(roleAssignments);

      return {
        roleIds: new Set(effectiveRoles.map((role) => role.id)),
        permissionSets: getPermissionSetsByRoles(effectiveRoles),
        roleAssignments: roleAssignments.map(({ role, currentLevel }) => ({
          roleId: role.id,
          currentLevel,
        })),
      };
    },
  ),
);
