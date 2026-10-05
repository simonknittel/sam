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
});

export const deleteShipAction = createAuthenticatedAction(
  "deleteShip",
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
     * Find existing ship and verify ownership
     */
    const existingShip = await prisma.ship.findFirst({
      where: {
        id: data.id,
        ownerId: authentication.session.entity.id,
      },
      select: {
        deletedAt: true,
      },
    });
    if (existingShip?.deletedAt !== null) {
      /** A different tab deleted the ship before, and the page must show it */
      return rejectConflict(t("Common.notFound"), formData);
    }

    /**
     * Soft delete
     */
    const deletedShip = await prisma.ship.update({
      where: {
        id: data.id,
        ownerId: authentication.session.entity.id,
      },
      data: {
        deletedAt: new Date(),
        deletedById: authentication.session.entity.id,
      },
    });

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.SHIP_DELETED_V2,
        data: {
          shipId: deletedShip.id,
          ownerId: deletedShip.ownerId,
          name: deletedShip.name,
          variantId: deletedShip.variantId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
