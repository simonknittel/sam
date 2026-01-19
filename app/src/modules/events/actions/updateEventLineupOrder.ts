"use server";

import { prisma } from "@/db";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
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

export const updateEventLineupOrder = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate
     */
    await requireAuthenticationAction("updateEventLineupOrder");

    /**
     * Validate the request
     */
    const result = schema.safeParse({
      eventId: formData.get("eventId"),
      order: JSON.parse(formData.get("order") as string) as unknown,
    });
    if (!result.success)
      return {
        error: t("Common.badRequest"),
        errorDetails: result.error,
        requestPayload: formData,
      };

    /**
     * Authorize the request
     */
    const event = await prisma.event.findUnique({
      where: {
        id: result.data.eventId,
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
    loop(result.data.order);
    await prisma.$transaction(transactions);

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
  } catch (error) {
    unstable_rethrow(error);
    log.error("Internal Server Error", { error: serializeError(error) });
    return {
      error: t("Common.internalServerError"),
      requestPayload: formData,
    };
  }
};
