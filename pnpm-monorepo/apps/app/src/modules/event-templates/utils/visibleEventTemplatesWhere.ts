import type { Prisma } from "@sam-monorepo/database/client";
import type { EventTemplateViewer } from "@sam-monorepo/permissions";

/**
 * The `where` fragment matching exactly the templates a viewer may see —
 * including their own soft-deleted ones, which they can restore. It mirrors
 * `resolveEventTemplatePermissions()` and exists so no call site (list,
 * detail, picker, duplicate source) can forget the soft-delete or visibility
 * exclusion. Combine it with an `AND` rather than spreading it, so a caller's
 * own `OR` cannot overwrite it.
 *
 * The resolver stays the authority on what a viewer may *do* with a template;
 * this only narrows the rows.
 */
export const visibleEventTemplatesWhere = (
  viewer: EventTemplateViewer,
): Prisma.EventTemplateWhereInput => {
  if (viewer.hasEventManage) return {};

  const alternatives: Prisma.EventTemplateWhereInput[] = [];

  if (viewer.citizenId) alternatives.push({ ownedById: viewer.citizenId });

  if (viewer.roleIds.size > 0)
    alternatives.push({
      deletedAt: null,
      roleAccess: { some: { roleId: { in: [...viewer.roleIds] } } },
    });

  /** Prisma reads an empty OR as "matches nothing", which is what we want */
  return { OR: alternatives };
};
