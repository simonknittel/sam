"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeEventContainer } from "../utils/authorizeEventContainer";
import {
  EVENT_CONTAINER_ID_FIELD,
  EVENT_CONTAINER_KIND_FIELD,
  eventContainerColumns,
  EventContainerKind,
  getLineupPath,
  type EventContainer,
} from "../utils/eventContainer";
import { buildLineupOrderChangedAuditEvent } from "../utils/lineupAuditEvents";

// TODO: Simplify recursion
const schema = z.object({
  containerKind: z.enum(EventContainerKind),
  containerId: z.string().min(1).max(64),
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
    const container: EventContainer = {
      kind: data.containerKind,
      id: data.containerId,
    };
    const authorization = await authorizeEventContainer(container, t);
    if (!authorization.allowed)
      return { error: authorization.error, requestPayload: formData };

    /**
     * Make sure every submitted position belongs to the authorized container.
     * Parent assignments are derived from the submitted tree, so this also
     * keeps every new parentPositionId inside the container.
     */
    const containerPositions = await prisma.eventPosition.findMany({
      where: eventContainerColumns(container),
      select: {
        id: true,
      },
    });
    const containerPositionIds = new Set(
      containerPositions.map((position) => position.id),
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
        (positionId) => !containerPositionIds.has(positionId),
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
      buildLineupOrderChangedAuditEvent(
        container,
        authentication.session.user.id,
      ),
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(getLineupPath(container));

    /**
     * Respond with the result
     */
    return {
      success: "Erfolgreich gespeichert.",
    };
  },
  {
    parseFormData: (formData) => ({
      containerKind: formData.get(EVENT_CONTAINER_KIND_FIELD),
      containerId: formData.get(EVENT_CONTAINER_ID_FIELD),
      order: JSON.parse(formData.get("order") as string) as unknown,
    }),
  },
);
