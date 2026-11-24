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
 * Effective role ids and permission sets per citizen, with the same rule as
 * the session of the app: the level gate and the inherited roles (see
 * `resolveEffectiveRoles()`). The result has only the citizens that match
 * `where`, are not deleted and have role assignments. No permission check:
 * the automations and the notification router use it to find the receivers,
 * and the lineup page and the wiki mentions use it for their own checks.
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
 * The effective permissions of the citizens that match `where`, are not
 * deleted and have each of the required permission sets through their
 * effective roles (see `loadEffectivePermissionsOfCitizens()`). No permission
 * check: the recipient rules of the notification router use it to find the
 * receivers.
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

/** The ids of the citizens of `findCitizensWithPermissions()` */
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

/**
 * Whether the citizen is not deleted and has each of the required permission
 * sets (see `findCitizensWithPermissions()`)
 */
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
