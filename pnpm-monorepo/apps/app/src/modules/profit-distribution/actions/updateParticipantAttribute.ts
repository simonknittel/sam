"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotificationsAfterSave } from "@/modules/notifications/utils/triggerNotification";
import { CyclePhase, getCurrentPhase } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import * as z from "zod";

export interface Change {
  citizenId: string;
  attribute: string;
  enabled: boolean;
}

/**
 * The form sends the cycle id and one key for each ticked attribute of a
 * citizen. The number of citizens has no fixed maximum, thus the limit is an
 * arbitrary number. It keeps the loops of the action bounded.
 */
const MAXIMUM_FORM_KEY_COUNT = 100;

const schema = z
  .record(z.string(), z.string())
  .refine((record) => Object.keys(record).length <= MAXIMUM_FORM_KEY_COUNT);

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
      const enabledAttributes = Object.keys(data)
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
          // @ts-expect-error The template-literal key can't be narrowed to the participant's properties
          participant[`${attribute}At`] &&
          enabledAttributes.includes(attribute)
        )
          continue;

        if (
          // @ts-expect-error The template-literal key can't be narrowed to the participant's properties
          !participant[`${attribute}At`] &&
          !enabledAttributes.includes(attribute)
        )
          continue;

        if (
          // @ts-expect-error The template-literal key can't be narrowed to the participant's properties
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
          // @ts-expect-error The template-literal key can't be narrowed to the participant's properties
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

    refresh();

    if (changes.length > 0) {
      await createAuditEvents([
        {
          type: AuditEventType.PROFIT_CYCLE_PARTICIPANT_UPDATED,
          data: {
            cycleId: data.cycleId,
            changes,
          },
          createdById: authentication.session.user.id,
        },
      ]);
    }

    /**
     * Trigger notifications
     */
    const isNotified = await triggerNotificationsAfterSave([
      {
        type: "ProfitDistributionPayoutDisbursed",
        payload: {
          cycleId: cycle.id,
          changes,
        },
      },
    ]);

    return {
      success: t("Common.successfullySaved"),
      ...(isNotified ? {} : { warning: t("Common.notificationsFailed") }),
    };
  },
);
