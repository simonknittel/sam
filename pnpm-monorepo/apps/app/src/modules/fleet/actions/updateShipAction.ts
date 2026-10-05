"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  id: z.cuid(),
  name: z.string().trim().max(255),
});

export const updateShipAction = createAuthenticatedAction(
  "updateShipAction",
  schema,
  async (formData, authentication, data, t) => {
    if (
      !(await authentication.authorize("ship", "manage")) ||
      !authentication.session.entity
    )
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Update
     */
    const { id, ...updateData } = data;

    const existingShip = await prisma.ship.findUnique({
      where: {
        id,
        ownerId: authentication.session.entity.id,
      },
      select: {
        name: true,
        deletedAt: true,
      },
    });
    if (existingShip?.deletedAt !== null) {
      /** A different tab deleted the ship before, and the page must show it */
      return rejectConflict(t("Common.notFound"), formData);
    }

    const updatedShip = await prisma.ship.update({
      where: {
        id,
        ownerId: authentication.session.entity.id,
      },
      data: {
        ...updateData,
        updatedById: authentication.session.entity.id,
      },
      select: {
        id: true,
        ownerId: true,
        name: true,
      },
    });

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.SHIP_UPDATED_V2,
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
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      name: formData.get("name"),
    }),
  },
);
