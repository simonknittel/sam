import {
  comparePermissionSets,
  getPermissionSetsByRoles,
  type WikiPageViewer,
  type WikiPermissionRole,
} from "@sam-monorepo/domain";
import { getEffectiveRolesOfCitizen } from "../auth/getEffectiveRolesOfCitizen.js";
import type { ApplicationContext } from "../context.js";

export interface WikiPermissionRoleWithName extends WikiPermissionRole {
  readonly name: string;
}

/**
 * Every role of the organization, prepared to resolve the wiki permissions
 * role by role, sorted by name. Takes no actor: the badge of the read
 * audience needs the roles for every reader, and whoever manages a page must
 * see every role that can reach it, also the roles that the reader cannot
 * see elsewhere (`otherRole;read`). Never fill a role picker with it.
 */
export const findWikiPermissionRoles = async (
  context: Pick<ApplicationContext, "prisma">,
): Promise<WikiPermissionRoleWithName[]> => {
  const roles = await context.prisma.role.findMany({
    select: {
      id: true,
      name: true,
      permissionStrings: true,
      inherits: { select: { id: true, permissionStrings: true } },
    },
  });

  return roles
    .map((role) => ({
      id: role.id,
      name: role.name,
      /**
       * The rule of `resolveEffectiveRoles()`: a citizen with a role also
       * has the roles that it inherits. The level check does not apply: it
       * depends on the assignment, not on the role.
       */
      effectiveRoleIds: [role.id, ...role.inherits.map(({ id }) => id)],
      hasWikiManage: comparePermissionSets(
        { resource: "wiki", operation: "manage" },
        getPermissionSetsByRoles([role, ...role.inherits]),
      ),
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
};

/**
 * The same viewer as the one of the actor in `buildWikiContext()`, without the
 * admin mode
 */
export const toWikiPageViewerOfCitizen = async (
  context: Pick<ApplicationContext, "prisma">,
  citizenId: string,
): Promise<WikiPageViewer> => {
  const { roleIds, permissionSets } = await getEffectiveRolesOfCitizen(
    context.prisma,
    citizenId,
  );

  return {
    citizenId,
    roleIds,
    hasWikiManage: comparePermissionSets(
      { resource: "wiki", operation: "manage" },
      permissionSets,
    ),
  };
};
