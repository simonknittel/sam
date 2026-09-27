import { getEffectiveRoles } from "@/modules/auth/server";
import {
  comparePermissionSets,
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
  const { roleIds, permissionSets } = await getEffectiveRoles(citizenId);

  return {
    citizenId,
    roleIds,
    hasWikiManage: comparePermissionSets(
      { resource: "wiki", operation: "manage" },
      permissionSets,
    ),
  };
};
