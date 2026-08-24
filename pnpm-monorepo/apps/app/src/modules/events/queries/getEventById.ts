import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { canSeeEvent } from "@/modules/events/utils/eventVisibility";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Event } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { EVENT_PAGE_RELATIONS_SELECT } from "./eventRelationSelects";

/**
 * One event with everything its layout and its subpages share. The position
 * tree is deliberately not part of it: only the lineup page renders it, and
 * this query sits behind the layout of all seven subpages — see
 * `getEventPositions()`.
 */
export const getEventById = cache(
  withTrace("getEventById", async (id: Event["id"]) => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("event", "read"))) forbidden();

    const event = await prisma.event.findUnique({
      where: {
        id,
      },
      include: {
        ...EVENT_PAGE_RELATIONS_SELECT,
        visibilityRoles: { select: { roleId: true } },
        createdBy: { select: { id: true, handle: true } },
      },
    });
    if (!event) return null;

    /**
     * Not visible is indistinguishable from nonexistent: callers translate
     * the null into a 404.
     */
    if (!(await canSeeEvent(event))) return null;

    return event;
  }),
);
