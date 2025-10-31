"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CyclePhase, getCurrentPhase } from "../utils/getCurrentPhase";

const schema = z.object({
  id: z.cuid2(),
  value: z.preprocess(
    (value) => (value === "true" ? true : value === "false" ? false : value),
    z.boolean(),
  ),
});

export const toggleMyCeded = createAuthenticatedAction(
  "toggleMyCeded",
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
    if (currentPhase !== CyclePhase.Collection)
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    /**
     *
     */
    await prisma.profitDistributionCycleParticipant.upsert({
      where: {
        cycleId_citizenId: {
          cycleId: data.id,
          citizenId: authentication.session.entity.id,
        },
      },
      update: {
        cededAt: data.value ? new Date() : null,
        cededById: authentication.session.entity.id,
      },
      create: {
        cycleId: data.id,
        citizenId: authentication.session.entity.id,
        cededAt: data.value ? new Date() : null,
        cededById: authentication.session.entity.id,
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
