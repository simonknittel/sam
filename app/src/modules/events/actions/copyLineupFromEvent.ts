"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAllowedToManagePositions } from "../utils/isAllowedToManagePositions";
import { isEventUpdatable } from "../utils/isEventUpdatable";

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
          managers: {
            select: {
              discordId: true,
            },
          },
          positions: {
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
     * Mirror positions from source event to target event
     */
    const sourcePositions = await prisma.eventPosition.findMany({
      where: { eventId: sourceEvent.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        order: true,
        parentPositionId: true,
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
    const orderOffset = targetEvent.positions.length;
    await prisma.$transaction(async (tx) => {
      const newIdsBySourceId = new Map<string, string>();

      for (const position of sourcePositions) {
        const createdPosition = await tx.eventPosition.create({
          data: {
            eventId: targetEvent.id,
            name: position.name,
            description: position.description,
            order: position.order + orderOffset,
            ...(position.requiredRoles.length
              ? {
                  requiredRoles: {
                    connect: position.requiredRoles.map(({ id }) => ({ id })),
                  },
                }
              : {}),
            ...(position.requiredVariants.length
              ? {
                  requiredVariants: {
                    createMany: {
                      data: position.requiredVariants.map(
                        ({ variantId, order }) => ({
                          variantId,
                          order,
                        }),
                      ),
                    },
                  },
                }
              : {}),
          },
        });

        newIdsBySourceId.set(position.id, createdPosition.id);
      }

      for (const position of sourcePositions) {
        if (!position.parentPositionId) continue;

        const childId = newIdsBySourceId.get(position.id);
        const parentId = newIdsBySourceId.get(position.parentPositionId);

        if (!childId || !parentId) continue;

        await tx.eventPosition.update({
          where: { id: childId },
          data: { parentPositionId: parentId },
        });
      }
    });

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/events/${targetEvent.id}/lineup`);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
