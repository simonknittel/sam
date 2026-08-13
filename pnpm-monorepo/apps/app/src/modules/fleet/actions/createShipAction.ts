"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  variantId: z.cuid(),
  name: z.string().trim().max(255).optional(),
});

export const createShipAction = createAuthenticatedAction(
  "createShipAction",
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
     * Assign the ship to the user
     */
    const ship = await prisma.ship.create({
      data: {
        ownerId: authentication.session.user.id,
        createdById: authentication.session.entity.id,
        ...data,
      },
      select: {
        id: true,
      },
    });
    await createAuditEvents([
      {
        type: AuditEventType.SHIP_CREATED,
        data: {
          shipId: ship.id,
          ownerId: authentication.session.user.id,
          variantId: data.variantId,
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
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      variantId: formData.get("variantId"),
      name: formData.has("name") ? formData.get("name") : undefined,
    }),
  },
);
