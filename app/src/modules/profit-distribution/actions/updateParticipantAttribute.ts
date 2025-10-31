"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CyclePhase, getCurrentPhase } from "../utils/getCurrentPhase";

export interface Change {
  citizenId: string;
  attribute: string;
  enabled: boolean;
}

const schema = z.record(z.string(), z.string());

export const updateParticipantAttribute = createAuthenticatedAction(
  "updateParticipantAttribute",
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
    if (!(await authentication.authorize("profitDistributionCycle", "update")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     *
     */
    const cycle = await prisma.profitDistributionCycle.findUnique({
      where: { id: data.cycleId },
      include: {
        participants: {
          select: {
            citizenId: true,
            cededAt: true,
            acceptedAt: true,
            disbursedAt: true,
            silcBalanceSnapshot: true,
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
    const validAttributes = [];
    if (
      [CyclePhase.Collection, CyclePhase.PayoutPreparation].includes(
        currentPhase,
      )
    )
      validAttributes.push("ceded");
    if (currentPhase === CyclePhase.Payout)
      validAttributes.push("accepted", "disbursed");

    const changes: Change[] = [];
    for (const participant of cycle.participants) {
      const enabledAttributes = Array.from(formData.keys())
        .filter((key) => {
          const [, , citizenId] = key.split("_");
          return citizenId === participant.citizenId;
        })
        .map((key) => {
          const [attribute] = key.split("_");
          return attribute;
        });

      for (const attribute of validAttributes) {
        if (
          // @ts-expect-error
          participant[`${attribute}At`] &&
          enabledAttributes.includes(attribute)
        )
          continue;

        if (
          // @ts-expect-error
          !participant[`${attribute}At`] &&
          !enabledAttributes.includes(attribute)
        )
          continue;

        if (
          // @ts-expect-error
          participant[`${attribute}At`] &&
          !enabledAttributes.includes(attribute)
        ) {
          changes.push({
            citizenId: participant.citizenId,
            attribute,
            enabled: false,
          });
          continue;
        }

        if (
          // @ts-expect-error
          !participant[`${attribute}At`] &&
          enabledAttributes.includes(attribute)
        ) {
          changes.push({
            citizenId: participant.citizenId,
            attribute,
            enabled: true,
          });
          continue;
        }
      }
    }

    await prisma.$transaction(
      changes.map((change) =>
        prisma.profitDistributionCycleParticipant.upsert({
          where: {
            cycleId_citizenId: {
              cycleId: data.cycleId,
              citizenId: change.citizenId,
            },
          },
          update: {
            [`${change.attribute}At`]: change.enabled ? new Date() : null,
            [`${change.attribute}ById`]: authentication.session.entity!.id,
          },
          create: {
            cycleId: data.cycleId,
            citizenId: change.citizenId,
            [`${change.attribute}At`]: change.enabled ? new Date() : null,
            [`${change.attribute}ById`]: authentication.session.entity!.id,
          },
        }),
      ),
    );

    /**
     * Trigger notifications
     */
    await triggerNotifications([
      {
        type: "ProfitDistributionPayoutDisbursed",
        payload: {
          cycleId: cycle.id,
          changes,
        },
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/sincome/${cycle.id}/management`);
    revalidatePath(`/app/sincome/${cycle.id}`);
    revalidatePath("/app/sincome");

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
