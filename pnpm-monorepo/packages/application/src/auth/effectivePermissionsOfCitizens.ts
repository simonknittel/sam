import type { Prisma } from "@sam-monorepo/database/client";
import {
  ACTIVE_CITIZEN_WHERE,
  comparePermissionSets,
  EFFECTIVE_ROLE_PERMISSIONS_SELECT,
  getPermissionSetsByRoles,
  resolveEffectiveRoles,
  type PermissionSet,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import type { EffectiveRoles } from "./getEffectiveRolesOfCitizen.js";

/**
 * The same rule as the session of the app (see `resolveEffectiveRoles()`). The
 * result leaves out deleted citizens and citizens without role assignments. No
 * permission check: the callers find receivers or check the access of a
 * citizen.
 */
export const loadEffectivePermissionsOfCitizens = async (
  context: Pick<ApplicationContext, "prisma">,
  where: Prisma.CitizenWhereInput,
): Promise<Map<string, Pick<EffectiveRoles, "roleIds" | "permissionSets">>> => {
  const assignments = await context.prisma.roleAssignment.findMany({
    where: { citizen: { AND: [where, ACTIVE_CITIZEN_WHERE] } },
    select: { citizenId: true, ...EFFECTIVE_ROLE_PERMISSIONS_SELECT },
  });

  const assignmentsByCitizenId = Map.groupBy(
    assignments,
    (assignment) => assignment.citizenId,
  );

  return new Map(
    Array.from(assignmentsByCitizenId, ([citizenId, citizenAssignments]) => {
      const effectiveRoles = resolveEffectiveRoles(citizenAssignments);

      return [
        citizenId,
        {
          roleIds: new Set(effectiveRoles.map((role) => role.id)),
          permissionSets: getPermissionSetsByRoles(effectiveRoles),
        },
      ];
    }),
  );
};

/**
 * Only the citizens who have each of the required permission sets. No
 * permission check, like `loadEffectivePermissionsOfCitizens()`.
 */
export const findCitizensWithPermissions = async (
  context: Pick<ApplicationContext, "prisma">,
  where: Prisma.CitizenWhereInput,
  requiredPermissionSets: readonly PermissionSet[],
): Promise<Map<string, Pick<EffectiveRoles, "roleIds" | "permissionSets">>> => {
  const permissionsByCitizenId = await loadEffectivePermissionsOfCitizens(
    context,
    where,
  );

  return new Map(
    Array.from(permissionsByCitizenId).filter(([, { permissionSets }]) =>
      requiredPermissionSets.every((requiredPermissionSet) =>
        comparePermissionSets(requiredPermissionSet, permissionSets),
      ),
    ),
  );
};

export const findCitizenIdsWithPermissions = async (
  context: Pick<ApplicationContext, "prisma">,
  where: Prisma.CitizenWhereInput,
  requiredPermissionSets: readonly PermissionSet[],
): Promise<Set<string>> =>
  new Set(
    (
      await findCitizensWithPermissions(context, where, requiredPermissionSets)
    ).keys(),
  );

export const isCitizenWithPermissions = async (
  context: Pick<ApplicationContext, "prisma">,
  citizenId: string,
  requiredPermissionSets: readonly PermissionSet[],
): Promise<boolean> =>
  (
    await findCitizenIdsWithPermissions(
      context,
      { id: citizenId },
      requiredPermissionSets,
    )
  ).has(citizenId);
