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
    if (
      !(await authentication.authorize("ship", "manage")) ||
      !authentication.session.entity
    )
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Assign the ship to the citizen of the session
     */
    const ship = await prisma.ship.create({
      data: {
        ownerId: authentication.session.entity.id,
        createdById: authentication.session.entity.id,
        ...data,
      },
      select: {
        id: true,
      },
    });
    await createAuditEvents([
      {
        type: AuditEventType.SHIP_CREATED_V2,
        data: {
          shipId: ship.id,
          ownerId: authentication.session.entity.id,
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
