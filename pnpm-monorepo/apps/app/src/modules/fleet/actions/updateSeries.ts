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
});

export const updateSeries = createAuthenticatedAction(
  "updateSeries",
  schema,
  async (formData, authentication, data, t) => {
    if (
      !(await authentication.authorize(
        "manufacturersSeriesAndVariants",
        "manage",
      ))
    )
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Update
     */
    const { id, ...updateData } = data;

    const existingSeries = await prisma.series.findUnique({
      where: {
        id,
      },
      select: {
        name: true,
      },
    });
    if (!existingSeries)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    const updatedItem = await prisma.series.update({
      where: {
        id,
      },
      data: updateData,
    });

    await createAuditEvents([
      {
        type: AuditEventType.SERIES_UPDATED,
        data: {
          seriesId: updatedItem.id,
          manufacturerId: updatedItem.manufacturerId,
          previousName: existingSeries.name,
          newName: updatedItem.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/fleet/settings`);
    revalidatePath(
      `/app/fleet/settings/manufacturers/${updatedItem.manufacturerId}`,
    );
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
      name: formData.get("name"),
    }),
  },
);
