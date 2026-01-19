"use server";

import { prisma } from "@/db";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { VariantStatus } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { createAndReturnTags } from "../utils/createAndReturnTags";

const schema = z.object({
  seriesId: z.string(),
  name: z.string().trim().min(1),
  status: z
    .enum([VariantStatus.FLIGHT_READY, VariantStatus.NOT_FLIGHT_READY])
    .optional(),
  tagKeys: z.array(z.string().trim()).max(50).optional(), // Arbitrary (untested) limit to prevent DDoS
  tagValues: z.array(z.string().trim()).max(50).optional(), // Arbitrary (untested) limit to prevent DDoS
});

export const createVariant = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationAction("createVariant");
    await authentication.authorizeAction(
      "manufacturersSeriesAndVariants",
      "manage",
    );

    /**
     * Validate the request
     */
    const result = schema.safeParse({
      seriesId: formData.get("seriesId"),
      name: formData.get("name"),
      status: formData.has("status") ? formData.get("status") : undefined,
      tagKeys: formData.has("tagKeys[]")
        ? formData.getAll("tagKeys[]")
        : undefined,
      tagValues: formData.has("tagValues[]")
        ? formData.getAll("tagValues[]")
        : undefined,
    });
    if (!result.success) {
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };
    }

    /**
     * Create variant
     */
    const tagsToConnect = await createAndReturnTags(
      result.data.tagKeys,
      result.data.tagValues,
    );

    const createdVariant = await prisma.variant.create({
      data: {
        seriesId: result.data.seriesId,
        name: result.data.name,
        status: result.data.status,
        ...(tagsToConnect &&
          tagsToConnect.length > 0 && {
            tags: {
              connect: tagsToConnect.map((tagId) => ({ id: tagId })),
            },
          }),
      },
      include: {
        series: true,
      },
    });

    /**
     * Revalidate cache(s)
     */
    revalidatePath(
      `/app/fleet/settings/manufacturers/${createdVariant.series.manufacturerId}`,
    );
    revalidatePath(
      `/app/fleet/settings/manufacturers/${createdVariant.series.manufacturerId}/series/${createdVariant.seriesId}`,
    );
    revalidatePath("/app/fleet/org");
    revalidatePath("/app/fleet/my-ships");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
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
