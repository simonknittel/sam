import { prisma } from "@sam-monorepo/database";
import type { Prisma } from "@sam-monorepo/database/client";
import {
  ACTIVE_CITIZEN_WHERE,
  EFFECTIVE_ROLE_PERMISSIONS_SELECT,
} from "@sam-monorepo/domain";
import {
  comparePermissionSets,
  getPermissionSetsByRoles,
  resolveEffectiveRoles,
  type PermissionSet,
} from "@sam-monorepo/permissions";

export interface EffectivePermissions {
  readonly roleIds: ReadonlySet<string>;
  readonly permissionSets: PermissionSet[];
}

/**
 * Effective role ids and permission sets per citizen, with the same rule as
 * the session of the app: the level gate and the inherited roles (see
 * `resolveEffectiveRoles()`). The result has only the citizens that match
 * `where`, are not deleted and have role assignments.
 */
export const loadEffectivePermissions = async (
  where: Prisma.CitizenWhereInput,
) => {
  const assignments = await prisma.roleAssignment.findMany({
    where: { citizen: { AND: [where, ACTIVE_CITIZEN_WHERE] } },
    select: { citizenId: true, ...EFFECTIVE_ROLE_PERMISSIONS_SELECT },
  });

  const permissionsByCitizenId = new Map<string, EffectivePermissions>();
  const assignmentsByCitizenId = Map.groupBy(
    assignments,
    (assignment) => assignment.citizenId,
  );
  for (const [citizenId, citizenAssignments] of assignmentsByCitizenId) {
    const effectiveRoles = resolveEffectiveRoles(citizenAssignments);
    permissionsByCitizenId.set(citizenId, {
      roleIds: new Set(effectiveRoles.map((role) => role.id)),
      permissionSets: getPermissionSetsByRoles(effectiveRoles),
    });
  }
  return permissionsByCitizenId;
};

/**
 * The ids of the citizens that match `where`, are not deleted and have each
 * of the required permission sets through their effective roles.
 */
export const findCitizenIdsWithPermissions = async (
  where: Prisma.CitizenWhereInput,
  requiredPermissionSets: readonly PermissionSet[],
) => {
  const permissionsByCitizenId = await loadEffectivePermissions(where);

  return new Set(
    Array.from(permissionsByCitizenId)
      .filter(([, { permissionSets }]) =>
        requiredPermissionSets.every((requiredPermissionSet) =>
          comparePermissionSets(requiredPermissionSet, permissionSets),
        ),
      )
      .map(([citizenId]) => citizenId),
  );
};
