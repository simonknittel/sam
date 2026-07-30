"use server";

import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { serverActionErrorHandler } from "@/modules/common/actions/serverActionErrorHandler";
import type { ServerAction } from "@/modules/common/actions/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  id: z.cuid(),
  name: z.string().trim().min(1).optional(),
  imageId: z.string().trim().min(1).max(255).optional(),
});

export const updateManufacturerAction: ServerAction = async (formData) => {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationAction(
      "updateManufacturerAction",
    );
    await authentication.authorizeAction(
      "manufacturersSeriesAndVariants",
      "manage",
    );

    /**
     * Validate the request
     */
    const { id, ...data } = schema.parse({
      id: formData.get("id"),
      name: formData.has("name") ? formData.get("name") : undefined,
      imageId: formData.has("imageId") ? formData.get("imageId") : undefined,
    });

    /**
     * Update
     */
    const existingManufacturer = await prisma.manufacturer.findUnique({
      where: {
        id,
      },
      select: {
        name: true,
        imageId: true,
      },
    });
    if (!existingManufacturer) throw new Error("Not found");

    const updatedManufacturer = await prisma.manufacturer.update({
      where: {
        id,
      },
      data,
    });

    await createAuditEvents([
      {
        type: AuditEventType.MANUFACTURER_UPDATED,
        data: {
          manufacturerId: updatedManufacturer.id,
          previousName: existingManufacturer.name,
          newName: updatedManufacturer.name,
          previousImageId: existingManufacturer.imageId || null,
          newImageId: updatedManufacturer.imageId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/fleet/settings`);
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
          "Beim Speichern ist ein Fehler aufgetreten. Der Hersteller konnte nicht gefunden werden.",
        "409": "Konflikt. Bitte aktualisiere die Seite und probiere es erneut.",
        "500": "Beim Speichern ist ein unerwarteter Fehler aufgetreten",
      },
    });
  }
};
