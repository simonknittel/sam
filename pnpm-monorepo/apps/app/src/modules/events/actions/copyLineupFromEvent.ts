"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clonePositions } from "../utils/clonePositions";
import { isAllowedToManagePositions } from "../utils/isAllowedToManagePositions";
import { isEventUpdatable } from "../utils/isEventUpdatable";
import { buildPositionTree } from "../utils/positionTree";

const schema = z.object({
  targetEventId: z.cuid(),
  sourceEventId: z.cuid(),
});

export const copyLineupFromEvent = createAuthenticatedAction(
  "copyLineupFromEvent",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Validate request data and authorization
     */
    const [targetEvent, sourceEvent] = await prisma.$transaction([
      prisma.event.findUnique({
        where: { id: data.targetEventId },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          discordCreatorId: true,
          createdById: true,
          managers: {
            select: {
              id: true,
            },
          },
          positions: {
            where: {
              parentPositionId: null,
            },
            select: {
              id: true,
            },
          },
        },
      }),

      prisma.event.findUnique({
        where: { id: data.sourceEventId },
        select: {
          id: true,
          lineupEnabled: true,
          discordCreatorId: true,
          createdById: true,
          managers: {
            select: {
              id: true,
            },
          },
        },
      }),
    ]);
    if (!targetEvent)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };
    if (!sourceEvent)
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    if (!isEventUpdatable(targetEvent))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };
    if (!(await isAllowedToManagePositions(targetEvent)))
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * The caller must be allowed to view the source lineup (same gate as the
     * lineup page: general event read permission plus an enabled lineup or
     * position-management rights on the source event).
     */
    if (!(await authentication.authorize("event", "read")))
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (
      !sourceEvent.lineupEnabled &&
      !(await isAllowedToManagePositions(sourceEvent))
    )
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * Mirror positions from source event to target event
     */
    const sourcePositions = await prisma.eventPosition.findMany({
      where: { eventId: sourceEvent.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        parentPositionId: true,
        name: true,
        description: true,
        fontSize: true,
        backgroundColor: true,
        textColor: true,
        requiredRoles: {
          select: {
            id: true,
          },
        },
        requiredVariants: {
          select: {
            variantId: true,
            order: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    await prisma.$transaction((transaction) =>
      clonePositions(transaction, buildPositionTree(sourcePositions), {
        eventId: targetEvent.id,
        parentPositionId: null,
        startOrder: targetEvent.positions.length,
      }),
    );

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_LINEUP_COPIED,
        data: {
          sourceEventId: sourceEvent.id,
          targetEventId: targetEvent.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/events/${targetEvent.id}/lineup`);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
