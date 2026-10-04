"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { CYCLE_PHASE_WHERE, CyclePhase } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  id: z.cuid2(),
  auecProfit: z.coerce.number().min(0),
  /** Without a planned end, the payout continues until an admin ends it */
  payoutEndsAt: z.preprocess((value) => {
    if (!value) return null;
    if (typeof value !== "string" && typeof value !== "number") return null;
    return new Date(value);
  }, z.date().nullable()),
});

export const startPayout = createAuthenticatedAction(
  "startPayout",
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
     * Start the payout. The guarded update also validates that the cycle
     * exists and is in its payout preparation phase.
     */
    const { count } = await prisma.profitDistributionCycle.updateMany({
      where: {
        id: data.id,
        ...CYCLE_PHASE_WHERE[CyclePhase.PayoutPreparation],
      },
      data: {
        payoutStartedAt: new Date(),
        payoutStartedById: authentication.session.entity.id,
        auecProfit: data.auecProfit,
        payoutEndsAt: data.payoutEndsAt,
      },
    });

    /**
     * Also for the error below: then a different tab or a different manager
     * started the payout before, and the page must show it.
     */
    refresh();

    if (count === 0)
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    await createAuditEvents([
      {
        type: AuditEventType.PROFIT_CYCLE_PAYOUT_STARTED,
        data: {
          cycleId: data.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Trigger notifications
     */
    await triggerNotifications([
      {
        type: "ProfitDistributionPayoutStarted",
        payload: {
          cycleId: data.id,
        },
      },
    ]);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
