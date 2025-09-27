"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  title: z.string().trim().max(128),
  collectionEndedAt: z.coerce.date(),
});

export const createProfitDistributionCycle = createAuthenticatedAction(
  "createProfitDistributionCycle",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (!(await authentication.authorize("profitDistributionCycle", "create")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Validate request data
     */
    if (data.collectionEndedAt <= new Date())
      return {
        error: "Das Ende des Sammelzeitraums muss in der Zukunft liegen.",
        requestPayload: formData,
      };

    /**
     * Create
     */
    const collectionEndedAt = new Date(data.collectionEndedAt);
    collectionEndedAt.setHours(0, 0, 0, 0);
    const created = await prisma.profitDistributionCycle.create({
      data: {
        title: data.title,
        collectionEndedAt,
        createdById: authentication.session.entity.id,
      },
    });

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/silc/profit-distribution");
    redirect(`/app/silc/profit-distribution/${created.id}`);
  },
);
