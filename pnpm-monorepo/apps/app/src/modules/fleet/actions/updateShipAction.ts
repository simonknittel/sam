"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";

const schema = z.object({
  id: z.cuid(),
  name: z.string().trim(),
});

export const updateShipAction = createAuthenticatedAction(
  "updateShipAction",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("ship", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (!authentication.session.entity)
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
        ownerId: authentication.session.user.id,
      },
      select: {
        id: true,
        ownerId: true,
        name: true,
        deletedAt: true,
      },
    });
    if (existingShip?.deletedAt !== null)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    const updatedShip = await prisma.ship.update({
      where: {
        id,
        ownerId: authentication.session.user.id,
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
