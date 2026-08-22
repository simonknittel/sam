import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Prisma } from "@sam-monorepo/database/client";
import {
  resolveEventTemplatePermissions,
  type ResolvedEventTemplatePermissions,
} from "@sam-monorepo/permissions";
import { cache } from "react";
import {
  EventTemplateSharing,
  EventTemplateStatus,
  type EventTemplateFilters,
} from "../utils/eventTemplateFilterParams";
import { visibleEventTemplatesWhere } from "../utils/visibleEventTemplatesWhere";
import { getEventTemplateViewer } from "./getEventTemplateViewer";

/** Everything the list table and the picker need about one template */
const LIST_SELECT = {
  id: true,
  name: true,
  description: true,
  visibility: true,
  coverImageId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  ownedById: true,
  ownedBy: { select: { id: true, handle: true } },
  updatedBy: { select: { id: true, handle: true } },
  roleAccess: { select: { roleId: true, type: true } },
} satisfies Prisma.EventTemplateSelect;

export type EventTemplateListItem = Prisma.EventTemplateGetPayload<{
  select: typeof LIST_SELECT;
}>;

export interface EventTemplateListEntry {
  readonly template: EventTemplateListItem;
  readonly permissions: ResolvedEventTemplatePermissions;
}

const statusFilter = (
  status: EventTemplateStatus,
): Prisma.EventTemplateWhereInput => {
  switch (status) {
    case EventTemplateStatus.Active:
      return { deletedAt: null };
    case EventTemplateStatus.Deleted:
      return { deletedAt: { not: null } };
    case EventTemplateStatus.All:
      return {};
    default:
      throw new Error(`Unexpected template status: ${status satisfies never}`);
  }
};

const sharingFilter = (
  sharing: EventTemplateSharing,
): Prisma.EventTemplateWhereInput => {
  switch (sharing) {
    case EventTemplateSharing.Personal:
      return { roleAccess: { none: {} } };
    case EventTemplateSharing.Shared:
      return { roleAccess: { some: {} } };
    case EventTemplateSharing.All:
      return {};
    default:
      throw new Error(
        `Unexpected template sharing filter: ${sharing satisfies never}`,
      );
  }
};

/**
 * The templates the current viewer may see, newest change first, with their
 * resolved permissions. The visibility fragment is ANDed in so no filter can
 * widen the result — the owner filter in particular is only honored for
 * `event;manage` holders, who see everything anyway.
 */
export const getEventTemplates = cache(
  withTrace(
    "getEventTemplates",
    async (
      filters: EventTemplateFilters,
    ): Promise<EventTemplateListEntry[]> => {
      const viewer = await getEventTemplateViewer();
      if (!viewer) return [];

      const templates = await prisma.eventTemplate.findMany({
        where: {
          AND: [
            visibleEventTemplatesWhere(viewer),
            statusFilter(filters.status),
            sharingFilter(filters.sharing),
            viewer.hasEventManage && filters.ownerId
              ? { ownedById: filters.ownerId }
              : {},
            filters.query
              ? {
                  OR: [
                    { name: { contains: filters.query, mode: "insensitive" } },
                    {
                      description: {
                        contains: filters.query,
                        mode: "insensitive",
                      },
                    },
                  ],
                }
              : {},
          ],
        },
        select: LIST_SELECT,
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      });

      const permissions = resolveEventTemplatePermissions(templates, viewer);

      return templates.map((template) => ({
        template,
        permissions: permissions.get(template.id)!,
      }));
    },
  ),
);

/**
 * The non-deleted templates the viewer may use when creating an event, for
 * the picker. Deliberately not filtered by `canEdit` — using a template is
 * what a read share is for.
 */
export const getUsableEventTemplates = cache(
  withTrace("getUsableEventTemplates", async () => {
    const viewer = await getEventTemplateViewer();
    if (!viewer) return [];

    const templates = await prisma.eventTemplate.findMany({
      where: {
        AND: [visibleEventTemplatesWhere(viewer), { deletedAt: null }],
      },
      select: LIST_SELECT,
      orderBy: [{ name: "asc" }],
    });

    const permissions = resolveEventTemplatePermissions(templates, viewer);

    return templates.filter(
      (template) => permissions.get(template.id)?.canRead === true,
    );
  }),
);

/**
 * The distinct owners of the templates in the system, for the management
 * list's owner filter. Only meaningful for `event;manage` holders, the only
 * viewers the filter is offered to.
 */
export const getEventTemplateOwners = cache(
  withTrace("getEventTemplateOwners", async () => {
    const viewer = await getEventTemplateViewer();
    if (!viewer?.hasEventManage) return [];

    return await prisma.entity.findMany({
      where: { ownedEventTemplates: { some: {} } },
      select: { id: true, handle: true },
      orderBy: { handle: "asc" },
    });
  }),
);
