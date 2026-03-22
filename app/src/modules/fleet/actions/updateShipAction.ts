"use server";
import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { serverActionErrorHandler } from "@/modules/common/actions/serverActionErrorHandler";
import type { ServerAction } from "@/modules/common/actions/types";
import { z } from "zod";

const schema = z.object({
  id: z.cuid(),
  name: z.string().trim(),
});

export const updateShipAction: ServerAction = async (formData) => {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication =
      await requireAuthenticationAction("updateShipAction");
    await authentication.authorizeAction("ship", "manage");

    /**
     * Validate the request
     */
    const { id, ...data } = schema.parse({
      id: formData.get("id"),
      name: formData.get("name"),
    });

    /**
     * Update
     */
    const existingShip = await prisma.ship.findUnique({
      where: {
        id,
        ownerId: authentication.session.user.id,
      },
      select: {
        id: true,
        ownerId: true,
        name: true,
      },
    });
    if (!existingShip) throw new Error("Not found");

    const updatedShip = await prisma.ship.update({
      where: {
        id,
        ownerId: authentication.session.user.id,
      },
      data,
      select: {
        id: true,
        ownerId: true,
        name: true,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.SHIP_UPDATED,
        data: {
          shipId: updatedShip.id,
          ownerId: updatedShip.ownerId,
          previousName: existingShip.name,
          newName: updatedShip.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

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
          "Beim Speichern ist ein Fehler aufgetreten. Das Schiff konnte nicht gefunden werden.",
        "409": "Konflikt. Bitte aktualisiere die Seite und probiere es erneut.",
        "500": "Beim Speichern ist ein unerwarteter Fehler aufgetreten",
      },
    });
  }
};
