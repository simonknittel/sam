"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CyclePhase, getCurrentPhase } from "../utils/getCurrentPhase";

const schema = z.object({
  id: z.cuid2(),
});

export const endPayout = createAuthenticatedAction(
  "endPayout",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!(await authentication.authorize("profitDistributionCycle", "update")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Validate the request
     */
    const cycle = await prisma.profitDistributionCycle.findUnique({
      where: { id: data.id },
    });
    if (!cycle)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };
    const currentPhase = getCurrentPhase(cycle);
    if (currentPhase !== CyclePhase.Payout)
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    /**
     *
     */
    await prisma.profitDistributionCycle.update({
      where: {
        id: data.id,
      },
      data: {
        payoutEndedAt: new Date(),
        payoutEndedById: authentication.session.entity?.id,
      },
    });

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/sincome/${data.id}/management`);
    revalidatePath(`/app/sincome/${data.id}`);
    revalidatePath("/app/sincome");

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
