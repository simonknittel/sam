"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  id: z.cuid(),
});

export const deleteShipAction = createAuthenticatedAction(
  "deleteShip",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("ship", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Delete
     */
    const deletedShip = await prisma.ship.delete({
      where: {
        id: data.id,
        ownerId: authentication.session.user.id,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.SHIP_DELETED,
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
     * Revalidate cache(s)
     */
    revalidatePath("/app/fleet/org");
    revalidatePath("/app/fleet/my-ships");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
