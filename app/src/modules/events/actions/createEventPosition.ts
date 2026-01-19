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

const schema = z.object({
  eventId: z.cuid(),
  name: z.string().trim().max(256),
  description: z.string().trim().max(512).optional(),
  variantIds: z.array(z.cuid()).max(250), // Arbitrary (untested) limit to prevent DDoS
  parentPositionId: z.cuid().optional(),
});

export const createEventPosition = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate
     */
    await requireAuthenticationAction("createEventPosition");

    /**
     * Validate the request
     */
    const result = schema.safeParse({
      eventId: formData.get("eventId"),
      name: formData.get("name"),
      description: formData.has("description")
        ? formData.get("description")
        : undefined,
      variantIds: formData.getAll("variantId[]") || [],
      parentPositionId: formData.has("parentPositionId")
        ? formData.get("parentPositionId")
        : undefined,
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
        positions: true,
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
     * Create entry
     */
    await prisma.eventPosition.create({
      data: {
        event: {
          connect: {
            id: result.data.eventId,
          },
        },
        name: result.data.name,
        description: result.data.description,
        order: event.positions.length,
        requiredVariants: {
          createMany: {
            data: result.data.variantIds.map((id, index) => ({
              variantId: id,
              order: index,
            })),
          },
        },
        ...(result.data.parentPositionId
          ? {
              parentPosition: {
                connect: {
                  id: result.data.parentPositionId,
                },
              },
            }
          : {}),
      },
    });

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/events/${event.id}/lineup`);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  } catch (error) {
    unstable_rethrow(error);
    log.error("Internal Server Error", {
      error: serializeError(error),
    });
    return {
      error: t("Common.internalServerError"),
      requestPayload: formData,
    };
  }
};
