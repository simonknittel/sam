"use server";

import { prisma } from "@/db";
import { VariantStatus } from "@/generated/prisma/client";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { serverActionErrorHandler } from "@/modules/common/actions/serverActionErrorHandler";
import type { ServerAction } from "@/modules/common/actions/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAndReturnTags } from "../utils/createAndReturnTags";

const schema = z.object({
  id: z.cuid(),
  name: z.string().trim().min(1).optional(),
  status: z
    .enum([VariantStatus.FLIGHT_READY, VariantStatus.NOT_FLIGHT_READY])
    .optional(),
  tagKeys: z.array(z.string().trim()).max(50).optional(), // Arbitrary (untested) limit to prevent DDoS
  tagValues: z.array(z.string().trim()).max(50).optional(), // Arbitrary (untested) limit to prevent DDoS
});

export const updateVariant: ServerAction = async (formData) => {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationAction("updateVariant");
    await authentication.authorizeAction(
      "manufacturersSeriesAndVariants",
      "manage",
    );

    /**
     * Validate the request
     */
    const { id, ...data } = schema.parse({
      id: formData.get("id"),
      name: formData.get("name"),
      status: formData.get("status"),
      tagKeys: formData.has("tagKeys[]")
        ? formData.getAll("tagKeys[]")
        : undefined,
      tagValues: formData.has("tagValues[]")
        ? formData.getAll("tagValues[]")
        : undefined,
    });

    /**
     * Update variant
     */
    const tagsToConnect = await createAndReturnTags(
      data.tagKeys,
      data.tagValues,
    );

    const existingVariant = await prisma.variant.findUnique({
      where: {
        id,
      },
      select: {
        name: true,
        status: true,
      },
    });
    if (!existingVariant) throw new Error("Not found");

    const updatedItem = await prisma.variant.update({
      where: {
        id,
      },
      data: {
        name: data.name,
        status: data.status,
        tags: {
          set: tagsToConnect.map((tagId) => ({ id: tagId })),
        },
      },
      include: {
        series: true,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.VARIANT_UPDATED,
        data: {
          variantId: updatedItem.id,
          seriesId: updatedItem.seriesId,
          previousName: existingVariant.name,
          newName: updatedItem.name,
          previousStatus: existingVariant.status,
          newStatus: updatedItem.status,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(
      `/app/fleet/settings/manufacturers/${updatedItem.series.manufacturerId}`,
    );
    revalidatePath(
      `/app/fleet/settings/manufacturers/${updatedItem.series.manufacturerId}/series/${updatedItem.seriesId}`,
    );
    revalidatePath("/app/fleet/org");
    revalidatePath("/app/fleet/my-ships");

    /**
     * Respond with the result
     */
    return {
      status: 200,
    };
  } catch (error) {
    return serverActionErrorHandler(error, {
      errorMessages: {
        "400": "Ungültige Anfrage",
        "401": "Du musst angemeldet sein, um diese Aktion auszuführen",
        "403": "Du bist nicht berechtigt, diese Aktion auszuführen",
        "404":
          "Beim Speichern ist ein Fehler aufgetreten. Die Variante konnte nicht gefunden werden.",
        "409": "Konflikt. Bitte aktualisiere die Seite und probiere es erneut.",
        "500": "Beim Speichern ist ein unerwarteter Fehler aufgetreten",
      },
    });
  }
};
