"use server";

import { prisma } from "@/db";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { z } from "zod";

const schema = z.object({
  variantId: z.cuid(),
  name: z.string().trim().max(255).optional(),
});

export const createShipAction = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication =
      await requireAuthenticationAction("createShipAction");
    await authentication.authorizeAction("ship", "manage");

    /**
     * Validate the request
     */
    const result = schema.safeParse({
      variantId: formData.get("variantId"),
      name: formData.has("name") ? formData.get("name") : undefined,
    });
    if (!result.success) {
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };
    }

    /**
     * Assign the ship to the user
     */
    await prisma.ship.create({
      data: {
        ownerId: authentication.session.user.id,
        ...result.data,
      },
    });

    /**
     * Revalidate cache(s)
     */
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
