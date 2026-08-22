import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Prisma } from "@sam-monorepo/database/client";
import {
  resolveEventTemplatePermissions,
  type ResolvedEventTemplatePermissions,
} from "@sam-monorepo/permissions";
import { cache } from "react";
import { visibleEventTemplatesWhere } from "../utils/visibleEventTemplatesWhere";
import { getEventTemplateViewer } from "./getEventTemplateViewer";

const DETAIL_SELECT = {
  id: true,
  name: true,
  description: true,
  visibility: true,
  coverImageId: true,
  coverImage: true,
  visibilityRoles: { select: { roleId: true } },
  roleAccess: { select: { roleId: true, type: true } },
  createdAt: true,
  createdBy: { select: { id: true, handle: true } },
  updatedAt: true,
  updatedBy: { select: { id: true, handle: true } },
  ownedById: true,
  ownedBy: { select: { id: true, handle: true } },
  deletedAt: true,
  deletedBy: { select: { id: true, handle: true } },
} satisfies Prisma.EventTemplateSelect;

export type EventTemplateDetail = Prisma.EventTemplateGetPayload<{
  select: typeof DETAIL_SELECT;
}>;

export interface EventTemplateContext {
  readonly template: EventTemplateDetail;
  readonly permissions: ResolvedEventTemplatePermissions;
}

/**
 * One template with the current viewer's effective permissions, or null when
 * the template does not exist or the viewer may not see it — the two are
 * deliberately indistinguishable, so every caller turns null into a 404.
 */
export const getEventTemplateById = cache(
  withTrace(
    "getEventTemplateById",
    async (templateId: string): Promise<EventTemplateContext | null> => {
      const viewer = await getEventTemplateViewer();
      if (!viewer) return null;

      const template = await prisma.eventTemplate.findFirst({
        where: {
          AND: [{ id: templateId }, visibleEventTemplatesWhere(viewer)],
        },
        select: DETAIL_SELECT,
      });
      if (!template) return null;

      const permissions = resolveEventTemplatePermissions(
        [template],
        viewer,
      ).get(template.id);
      if (!permissions?.canRead) return null;

      return { template, permissions };
    },
  ),
);
