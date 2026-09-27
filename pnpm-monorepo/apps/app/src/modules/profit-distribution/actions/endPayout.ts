"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { CYCLE_PHASE_WHERE, CyclePhase } from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import * as z from "zod";

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
     * End the payout. The guarded update also validates that the cycle
     * exists and is in its payout phase.
     */
    const { count } = await prisma.profitDistributionCycle.updateMany({
      where: {
        id: data.id,
        ...CYCLE_PHASE_WHERE[CyclePhase.Payout],
      },
      data: {
        payoutEndedAt: new Date(),
        payoutEndedById: authentication.session.entity.id,
      },
    });
    if (count === 0)
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    await createAuditEvents([
      {
        type: AuditEventType.PROFIT_CYCLE_PAYOUT_ENDED,
        data: {
          cycleId: data.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

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
