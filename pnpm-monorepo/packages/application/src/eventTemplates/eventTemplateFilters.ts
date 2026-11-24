import type { Prisma } from "@sam-monorepo/database/client";

export enum EventTemplateStatus {
  Active = "active",
  Deleted = "deleted",
  All = "all",
}

/** Whether a template is shared with roles at all, not with which ones */
export enum EventTemplateSharing {
  Personal = "personal",
  Shared = "shared",
  All = "all",
}

export const buildEventTemplateStatusWhere = (
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
      throw new Error(`Unknown template status: ${status satisfies never}`);
  }
};

export const buildEventTemplateSharingWhere = (
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
        `Unknown template sharing filter: ${sharing satisfies never}`,
      );
  }
};
