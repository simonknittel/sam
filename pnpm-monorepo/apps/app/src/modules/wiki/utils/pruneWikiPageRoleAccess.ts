import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { getWikiPermissionRoles } from "../queries/getWikiPermissionRoles";
import { collectWikiPageRolePrunes } from "./collectWikiPageRolePrunes";
import type { WikiPagePermissionSource } from "./resolveWikiPagePermissions";

/**
 * Deletes role access of the given pages that grants nothing because the
 * role cannot read the page's parent — the counterpart of the subset
 * validation in updateWikiPagePermissions for the routes that copy pages
 * around instead of editing their permissions.
 *
 * `pages` must describe the state AFTER the change, including newly created
 * pages, and is only read. Returns what was removed so callers can report it.
 */
export const pruneWikiPageRoleAccess = async (
  pages: readonly WikiPagePermissionSource[],
  pageIds: readonly string[],
  trigger: "DUPLICATED",
  createdById: string,
) => {
  const roles = await getWikiPermissionRoles();
  const prunes = collectWikiPageRolePrunes(pages, roles, pageIds);
  if (prunes.length === 0) return prunes;

  await prisma.wikiPageRoleAccess.deleteMany({
    where: {
      OR: prunes.map((prune) => ({
        pageId: prune.pageId,
        roleId: { in: prune.roleIds },
      })),
    },
  });

  await createAuditEvents(
    prunes.map((prune) => ({
      type: AuditEventType.WIKI_PAGE_ROLE_ACCESS_PRUNED,
      data: {
        pageId: prune.pageId,
        removedRoleIds: prune.roleIds,
        trigger,
      },
      createdById,
    })),
  );

  return prunes;
};
