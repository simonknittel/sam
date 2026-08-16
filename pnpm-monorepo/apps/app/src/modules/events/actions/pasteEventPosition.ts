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
import {
  canPasteSubtree,
  getPositionLevel,
  getPositionSubtree,
  getSubtreeDepth,
  MAX_POSITIONS_PER_LEVEL,
} from "../utils/positionTree";

const schema = z.object({
  sourcePositionId: z.cuid(),
  targetPositionId: z.cuid(),
  placement: z.enum(["after", "inside"]),
});

const eventSelect = {
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
} as const;

export const pasteEventPosition = createAuthenticatedAction(
  "pasteEventPosition",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Validate request data
     */
    const [sourcePosition, targetPosition] = await prisma.$transaction([
      prisma.eventPosition.findUnique({
        where: { id: data.sourcePositionId },
        select: {
          id: true,
          name: true,
          eventId: true,
          event: { select: eventSelect },
        },
      }),

      prisma.eventPosition.findUnique({
        where: { id: data.targetPositionId },
        select: {
          id: true,
          order: true,
          parentPositionId: true,
          eventId: true,
          event: { select: eventSelect },
        },
      }),
    ]);
    if (!sourcePosition || !targetPosition)
      return {
        error: "Posten nicht gefunden",
        requestPayload: formData,
      };

    /**
     * Authorize the request. The source event doesn't need to be updatable
     * since copying out of an event which is already over is the whole point of
     * pasting into another event.
     */
    if (!(await isAllowedToManagePositions(sourcePosition.event)))
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (!isEventUpdatable(targetPosition.event))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };
    if (!(await isAllowedToManagePositions(targetPosition.event)))
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * Make sure the paste doesn't break the lineup
     */
    const sourceEventPositions = await prisma.eventPosition.findMany({
      where: { eventId: sourcePosition.eventId },
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

    const subtree = getPositionSubtree(sourceEventPositions, sourcePosition.id);
    if (!subtree)
      return { error: "Posten nicht gefunden", requestPayload: formData };

    const targetEventPositions =
      targetPosition.eventId === sourcePosition.eventId
        ? sourceEventPositions
        : await prisma.eventPosition.findMany({
            where: { eventId: targetPosition.eventId },
            select: {
              id: true,
              parentPositionId: true,
            },
          });

    const targetLevel = getPositionLevel(
      targetEventPositions,
      targetPosition.id,
    );
    const parentLevel =
      data.placement === "inside" ? targetLevel : targetLevel - 1;
    if (!canPasteSubtree(parentLevel, getSubtreeDepth(subtree)))
      return {
        error: "Der Posten würde zu tief verschachtelt werden.",
        requestPayload: formData,
      };

    const parentPositionId =
      data.placement === "inside"
        ? targetPosition.id
        : targetPosition.parentPositionId;

    const siblings = await prisma.eventPosition.count({
      where: {
        eventId: targetPosition.eventId,
        parentPositionId,
      },
    });
    if (siblings >= MAX_POSITIONS_PER_LEVEL)
      return {
        error: `Auf dieser Ebene sind maximal ${MAX_POSITIONS_PER_LEVEL} Posten möglich.`,
        requestPayload: formData,
      };

    /**
     * Paste the position
     */
    const createdPositions = await prisma.$transaction(async (transaction) => {
      let startOrder: number;

      if (data.placement === "inside") {
        const { _max } = await transaction.eventPosition.aggregate({
          where: {
            eventId: targetPosition.eventId,
            parentPositionId: targetPosition.id,
          },
          _max: { order: true },
        });

        startOrder = (_max.order ?? -1) + 1;
      } else {
        startOrder = targetPosition.order + 1;

        await transaction.eventPosition.updateMany({
          where: {
            eventId: targetPosition.eventId,
            parentPositionId: targetPosition.parentPositionId,
            order: { gte: startOrder },
          },
          data: {
            order: { increment: 1 },
          },
        });
      }

      return clonePositions(transaction, [subtree], {
        eventId: targetPosition.eventId,
        parentPositionId,
        startOrder,
      });
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_POSITION_COPIED,
        data: {
          sourceEventId: sourcePosition.eventId,
          sourcePositionId: sourcePosition.id,
          targetEventId: targetPosition.eventId,
          targetPositionId: targetPosition.id,
          placement: data.placement,
          positionCount: createdPositions,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/events/${targetPosition.eventId}/lineup`);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
