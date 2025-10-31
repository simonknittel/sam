"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { updateCitizensSilcBalances } from "@/modules/silc/utils/updateCitizensSilcBalances";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CyclePhase, getCurrentPhase } from "../utils/getCurrentPhase";

const schema = z.object({
  id: z.cuid2(),
});

export const endCollectionPhase = createAuthenticatedAction(
  "endCollectionPhase",
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
    if (currentPhase !== CyclePhase.Collection)
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    /**
     *
     */
    const allSilcBalances = await prisma.entity.findMany({
      where: {
        silcBalance: {
          gt: 0,
        },
      },
    });

    await prisma.$transaction([
      prisma.profitDistributionCycle.update({
        where: {
          id: data.id,
        },
        data: {
          collectionEndedAt: new Date(),
          collectionEndedById: authentication.session.entity?.id,
        },
      }),

      ...allSilcBalances.map((entity) =>
        prisma.profitDistributionCycleParticipant.upsert({
          where: {
            cycleId_citizenId: {
              cycleId: data.id,
              citizenId: entity.id,
            },
          },
          update: {
            silcBalanceSnapshot: entity.silcBalance,
          },
          create: {
            cycleId: data.id,
            citizenId: entity.id,
            silcBalanceSnapshot: entity.silcBalance,
          },
        }),
      ),

      prisma.silcTransaction.createMany({
        data: allSilcBalances.map((citizen) => ({
          receiverId: citizen.id,
          value: -citizen.silcBalance,
          description: `SINcome: ${cycle.title}`,
          createdById: authentication.session.entity!.id,
        })),
      }),
    ]);

    await updateCitizensSilcBalances(
      allSilcBalances.map((citizen) => citizen.id),
    );

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
