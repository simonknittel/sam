"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAllowedToManagePositions } from "../utils/isAllowedToManagePositions";
import { isEventUpdatable } from "../utils/isEventUpdatable";

// TODO: Simplify recursion
const schema = z.object({
  eventId: z.cuid(),
  order: z
    .array(
      z.object({
        id: z.cuid(),
        order: z.number().int().min(0),
        childPositions: z
          .array(
            z.object({
              id: z.cuid(),
              order: z.number().int().min(0),
              childPositions: z
                .array(
                  z.object({
                    id: z.cuid(),
                    order: z.number().int().min(0),
                    childPositions: z
                      .array(
                        z.object({
                          id: z.cuid(),
                          order: z.number().int().min(0),
                        }),
                      )
                      .max(50) // Arbitrary (untested) limit to prevent DDoS
                      .optional(),
                  }),
                )
                .max(50) // Arbitrary (untested) limit to prevent DDoS
                .optional(),
            }),
          )
          .max(50) // Arbitrary (untested) limit to prevent DDoS
          .optional(),
      }),
    )
    .max(50), // Arbitrary (untested) limit to prevent DDoS
});

export interface MappedPosition {
  id: string;
  order: number;
  childPositions?: MappedPosition[];
}

export const updateEventLineupOrder = createAuthenticatedAction(
  "updateEventLineupOrder",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    const event = await prisma.event.findUnique({
      where: {
        id: data.eventId,
      },
      include: {
        managers: true,
      },
    });
    if (!event)
      return { error: "Event nicht gefunden", requestPayload: formData };
    if (!isEventUpdatable(event))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };
    if (!(await isAllowedToManagePositions(event)))
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * Make sure every submitted position belongs to the authorized event.
     * Parent assignments are derived from the submitted tree, so this also
     * keeps every new parentPositionId within the event.
     */
    const eventPositions = await prisma.eventPosition.findMany({
      where: {
        eventId: event.id,
      },
      select: {
        id: true,
      },
    });
    const eventPositionIds = new Set(
      eventPositions.map((position) => position.id),
    );
    const flattenPositionIds = (positions: MappedPosition[]): string[] =>
      positions.flatMap((position) => [
        position.id,
        ...(position.childPositions
          ? flattenPositionIds(position.childPositions)
          : []),
      ]);
    if (
      flattenPositionIds(data.order).some(
        (positionId) => !eventPositionIds.has(positionId),
      )
    )
      return { error: t("Common.badRequest"), requestPayload: formData };

    /**
     * Update lineup order
     */
    const transactions: ReturnType<typeof prisma.eventPosition.update>[] = [];
    const loop = (
      positions: MappedPosition[],
      parentPosition?: MappedPosition,
    ) => {
      for (const position of positions) {
        transactions.push(
          prisma.eventPosition.update({
            where: {
              id: position.id,
            },
            data: {
              order: position.order,
              parentPositionId: {
                set: parentPosition ? parentPosition.id : null,
              },
            },
          }),
        );

        if (position.childPositions) {
          loop(position.childPositions, position);
        }
      }
    };
    loop(data.order);
    await prisma.$transaction(transactions);

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_LINEUP_ORDER_CHANGED,
        data: {
          eventId: event.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/events/${event.id}/lineup`);

    /**
     * Respond with the result
     */
    return {
      success: "Erfolgreich gespeichert.",
    };
  },
  {
    parseFormData: (formData) => ({
      eventId: formData.get("eventId"),
      order: JSON.parse(formData.get("order") as string) as unknown,
    }),
  },
);
