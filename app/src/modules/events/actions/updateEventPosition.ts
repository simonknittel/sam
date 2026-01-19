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
  positionId: z.cuid(),
  name: z.string().trim().max(256),
  description: z.string().trim().max(512).optional(),
  variantIds: z.array(z.cuid()).max(250), // Arbitrary (untested) limit to prevent DDoS
});

export const updateEventPosition = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate
     */
    await requireAuthenticationAction("updateEventPosition");

    /**
     * Validate the request
     */
    const result = schema.safeParse({
      positionId: formData.get("positionId"),
      name: formData.get("name"),
      description: formData.has("description")
        ? formData.get("description")
        : undefined,
      variantIds: formData.getAll("variantId[]") || [],
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
    const position = await prisma.eventPosition.findUnique({
      where: {
        id: result.data.positionId,
      },
      include: {
        event: {
          include: {
            managers: true,
          },
        },
        requiredVariants: true,
      },
    });
    if (!position)
      return { error: "Posten nicht gefunden", requestPayload: formData };
    if (!isEventUpdatable(position.event))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };
    if (!(await isAllowedToManagePositions(position.event)))
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * Update position
     */
    await prisma.$transaction([
      prisma.eventPositionRequiredVariant.deleteMany({
        where: {
          positionId: position.id,
        },
      }),

      prisma.eventPosition.update({
        where: {
          id: result.data.positionId,
        },
        data: {
          name: result.data.name,
          description: result.data.description,
          requiredVariants: {
            createMany: {
              data: result.data.variantIds.map((id, index) => ({
                variantId: id,
                order: index,
              })),
            },
          },
        },
      }),
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/events/${position.event.id}/lineup`);

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
