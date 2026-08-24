import { prisma } from "@/db";
import { EFFECTIVE_ROLE_PERMISSIONS_SELECT } from "@sam-monorepo/domain";
import {
  comparePermissionSets,
  getPermissionSetsByRoles,
  resolveEffectiveRoles,
  type WikiPageViewer,
} from "@sam-monorepo/permissions";

/**
 * Builds the wiki viewer of another citizen, e.g. to check whether someone
 * would actually be able to reach a page before making them its owner.
 * Mirrors `getWikiContext()`'s viewer, which is derived from the session.
 */
export const getWikiViewerForCitizen = async (
  citizenId: string,
): Promise<WikiPageViewer> => {
  const roleAssignments = await prisma.roleAssignment.findMany({
    where: { citizenId },
    select: EFFECTIVE_ROLE_PERMISSIONS_SELECT,
  });

  const effectiveRoles = resolveEffectiveRoles(roleAssignments);

  return {
    citizenId,
    roleIds: new Set(effectiveRoles.map((role) => role.id)),
    hasWikiManage: comparePermissionSets(
      { resource: "wiki", operation: "manage" },
      getPermissionSetsByRoles(effectiveRoles),
    ),
  };
};
