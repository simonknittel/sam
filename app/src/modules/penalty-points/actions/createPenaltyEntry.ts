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
  citizenId: z.cuid(),
  points: z.coerce.number().int().min(1),
  reason: z.string().trim().max(512).optional(),
  expiresAt: z.coerce.date().optional(),
});

export const createPenaltyEntry = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication =
      await requireAuthenticationAction("createPenaltyEntry");
    await authentication.authorizeAction("penaltyEntry", "create");
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Validate the request
     */
    const result = schema.safeParse({
      citizenId: formData.get("citizenId"),
      points: formData.get("points"),
      reason: formData.has("reason") ? formData.get("reason") : undefined,
      expiresAt:
        formData.has("expiresAt") && formData.get("expiresAt") !== ""
          ? formData.get("expiresAt")
          : undefined,
    });
    if (!result.success)
      return {
        error: t("Common.badRequest"),
        errorDetails: result.error,
        requestPayload: formData,
      };

    /**
     * Create entry
     */
    const createdEntry = await prisma.penaltyEntry.create({
      data: {
        createdBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
        citizen: {
          connect: {
            id: result.data.citizenId,
          },
        },
        points: result.data.points,
        reason: result.data.reason,
        expiresAt: result.data.expiresAt,
      },
    });

    /**
     * Revalidate cache(s)
     */
    revalidatePath(
      `/app/spynet/citizen/${createdEntry.citizenId}/penalty-points`,
    );
    revalidatePath("/app/penalty-points");

    /**
     * Respond with the result
     */
    return {
      success: "Erfolgreich gespeichert.",
    };
  } catch (error) {
    unstable_rethrow(error);
    void log.error("Internal Server Error", { error: serializeError(error) });
    return {
      error: t("Common.internalServerError"),
      requestPayload: formData,
    };
  }
};
