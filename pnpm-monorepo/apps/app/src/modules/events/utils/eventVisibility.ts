import {
  getEffectiveRoles,
  requireAuthentication,
} from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { EventVisibility, type Prisma } from "@sam-monorepo/database/client";
import { cache } from "react";
import {
  resolveEventVisibility,
  type EventViewer,
  type EventVisibilityInput,
} from "./resolveEventVisibility";

export const getEventViewer = cache(
  withTrace("getEventViewer", async (): Promise<EventViewer> => {
    const authentication = await requireAuthentication();
    const citizenId = authentication.session.entity?.id ?? null;

    const [hasEventManage, effectiveRoles] = await Promise.all([
      authentication.authorize("event", "manage"),
      citizenId ? getEffectiveRoles(citizenId) : null,
    ]);

    return {
      citizenId,
      roleIds: effectiveRoles?.roleIds ?? new Set(),
      hasEventManage,
    };
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
