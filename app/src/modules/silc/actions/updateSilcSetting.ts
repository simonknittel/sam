"use server";

import { prisma } from "@/db";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { SilcSettingKey } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { z } from "zod";

const schema = z.object({
  key: z.literal(SilcSettingKey.AUEC_CONVERSION_RATE),
  value: z.coerce
    .number()
    .min(1)
    .transform((value) => value.toString()),
});

export const updateSilcSetting = async (
  previousState: unknown,
  formData: FormData,
) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication =
      await requireAuthenticationAction("updateSilcSetting");
    await authentication.authorizeAction("silcSetting", "update");
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Validate the request
     */
    const result = schema.safeParse({
      key: formData.get("key"),
      value: formData.get("value"),
    });
    if (!result.success) {
      log.warn("Invalid Zod schema", {
        error: serializeError(result.error),
      });
      return {
        error: t("Common.badRequest"),
        errorDetails: result.error,
        requestPayload: formData,
      };
    }

    /**
     * Update setting
     */
    await prisma.silcSetting.upsert({
      where: {
        key: result.data.key,
      },
      update: {
        value: result.data.value,
        updatedBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
      },
      create: {
        key: result.data.key,
        value: result.data.value,
        updatedBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
      },
    });

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/silc/settings");
    revalidatePath("/app/silc");

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
