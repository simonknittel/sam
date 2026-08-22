import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { visibleEventTemplatesWhere } from "../utils/visibleEventTemplatesWhere";
import { getEventTemplateViewer } from "./getEventTemplateViewer";

/**
 * Whether the templates section has anything to offer the current viewer:
 * they may create one, they manage all of them, or at least one template is
 * visible to them — which covers a role-shared editor without `event;create`.
 * Drives the navigation item and the section's own gate.
 */
export const hasEventTemplatesAccess = cache(
  withTrace("hasEventTemplatesAccess", async () => {
    const authentication = await authenticate();
    if (!authentication) return false;

    const viewer = await getEventTemplateViewer();
    if (!viewer) return false;

    if (viewer.hasEventManage) return true;
    if (await authentication.authorize("event", "create")) return true;

    const visibleTemplate = await prisma.eventTemplate.findFirst({
      where: { AND: [visibleEventTemplatesWhere(viewer), { deletedAt: null }] },
      select: { id: true },
    });

    return visibleTemplate !== null;
  }),
);
