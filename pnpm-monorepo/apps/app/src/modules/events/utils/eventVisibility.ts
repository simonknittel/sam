import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { EventVisibility, type Prisma } from "@sam-monorepo/database/client";
import { EFFECTIVE_ROLE_IDS_SELECT } from "@sam-monorepo/domain";
import { resolveEffectiveRoles } from "@sam-monorepo/permissions";
import { cache } from "react";
import {
  resolveEventVisibility,
  type EventViewer,
  type EventVisibilityInput,
} from "./resolveEventVisibility";

export const getEventViewer = cache(
  withTrace("getEventViewer", async (): Promise<EventViewer> => {
    const authentication = await requireAuthentication();
    const hasEventManage = await authentication.authorize("event", "manage");
    const citizenId = authentication.session.entity?.id ?? null;

    const roleAssignments = citizenId
      ? await prisma.roleAssignment.findMany({
          where: { citizenId },
          select: EFFECTIVE_ROLE_IDS_SELECT,
        })
      : [];

    /**
     * Same semantics as the session callback and `getWikiContext()` — all
     * use `resolveEffectiveRoles()`: leveled roles only count once the max
     * level is reached, and inherited roles are included.
     */
    const roleIds = new Set(
      resolveEffectiveRoles(roleAssignments).map((role) => role.id),
    );

    return { citizenId, roleIds, hasEventManage };
  }),
);

/**
 * Prisma where fragment matching exactly the events
 * `resolveEventVisibility()` allows for the current viewer. Every event list
 * query must AND this in so no call site can forget the soft-delete or
 * visibility exclusion.
 */
export const getVisibleEventsWhere =
  async (): Promise<Prisma.EventWhereInput> => {
    const viewer = await getEventViewer();

    if (viewer.hasEventManage) return { deletedAt: null };

    const memberConditions: Prisma.EventWhereInput[] =
      viewer.citizenId !== null
        ? [
            { createdById: viewer.citizenId },
            { managers: { some: { id: viewer.citizenId } } },
          ]
        : [];

    return {
      deletedAt: null,
      OR: [
        { visibility: EventVisibility.PUBLIC },
        {
          visibilityRoles: {
            some: { roleId: { in: Array.from(viewer.roleIds) } },
          },
        },
        ...memberConditions,
      ],
    };
  };

/**
 * Single-event visibility check for the current viewer. Callers treat a
 * `false` as "does not exist" (`notFound()`) so restricted events stay fully
 * invisible.
 */
export const canSeeEvent = async (
  event: EventVisibilityInput,
): Promise<boolean> => resolveEventVisibility(event, await getEventViewer());
