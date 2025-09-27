"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  id: z.cuid(),
});

export const deleteSeries = createAuthenticatedAction(
  "deleteSeries",
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
     * Delete
     */
    const deletedSeries = await prisma.series.delete({
      where: {
        id: data.id,
      },
    });

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/fleet/settings");
    revalidatePath(
      `/app/fleet/settings/manufacturers/${deletedSeries.manufacturerId}`,
    );
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
