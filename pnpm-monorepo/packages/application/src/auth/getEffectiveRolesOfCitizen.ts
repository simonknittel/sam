import type { RoleAssignment } from "@sam-monorepo/database/client";
import {
  EFFECTIVE_ROLE_PERMISSIONS_SELECT,
  getPermissionSetsByRoles,
  resolveEffectiveRoles,
  type PermissionSet,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";

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
 * The session of the app and the principal of the MCP server use it, thus both
 * give the same permissions
 */
export const getEffectiveRolesOfCitizen = async (
  prisma: ApplicationContext["prisma"],
  citizenId: string,
): Promise<EffectiveRoles> => {
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
};
