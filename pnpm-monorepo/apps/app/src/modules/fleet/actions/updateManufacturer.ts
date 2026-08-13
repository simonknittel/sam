"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  id: z.cuid(),
  name: z.string().trim().min(1).optional(),
  imageId: z.string().trim().min(1).max(255).optional(),
});

export const updateManufacturerAction = createAuthenticatedAction(
  "updateManufacturerAction",
  schema,
  async (formData, authentication, data, t) => {
    if (
      !(await authentication.authorize("manufacturersSeriesAndVariants", "manage"))
    )
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Update
     */
    const { id, ...updateData } = data;

    const existingManufacturer = await prisma.manufacturer.findUnique({
      where: {
        id,
      },
      select: {
        name: true,
        imageId: true,
      },
    });
    if (!existingManufacturer)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    const updatedManufacturer = await prisma.manufacturer.update({
      where: {
        id,
      },
      data: updateData,
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
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      name: formData.has("name") ? formData.get("name") : undefined,
      imageId: formData.has("imageId") ? formData.get("imageId") : undefined,
    }),
  },
);
