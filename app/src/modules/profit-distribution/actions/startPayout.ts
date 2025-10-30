"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { triggerNotification } from "@/modules/notifications/utils/triggerNotification";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CyclePhase, getCurrentPhase } from "../utils/getCurrentPhase";

const schema = z.object({
  id: z.cuid2(),
  auecProfit: z.coerce.number().min(0),
  payoutEndedAt: z.preprocess((value) => {
    if (!value) return null;
    if (typeof value !== "string" && typeof value !== "number") return null;
    return new Date(value);
  }, z.date().nullish()),
});

export const startPayout = createAuthenticatedAction(
  "startPayout",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await getUnleashFlag(UNLEASH_FLAG.EnableProfitDistribution)))
      notFound();

    /**
     * Authorize the request
     */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
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
      include: {
        participants: {
          select: {
            citizenId: true,
          },
        },
      },
    });
    if (!cycle)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };
    const currentPhase = getCurrentPhase(cycle);
    if (currentPhase !== CyclePhase.PayoutPreparation)
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
        payoutStartedAt: new Date(),
        payoutStartedById: authentication.session.entity.id,
        auecProfit: data.auecProfit,
        payoutEndedAt: data.payoutEndedAt,
      },
    });

    /**
     * Trigger notifications
     */
    await triggerNotification([
      {
        type: "ProfitDistributionPayoutStarted",
        payload: {
          cycleId: data.id,
        },
      }
    ])

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
