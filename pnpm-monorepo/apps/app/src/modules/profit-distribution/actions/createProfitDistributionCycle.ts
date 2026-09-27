"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

const schema = z.object({
  title: z.string().trim().max(128),
  collectionEndsAt: z.coerce.date(),
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
    const collectionEndsAt = new Date(data.collectionEndsAt);
    collectionEndsAt.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (collectionEndsAt < today)
      return {
        error: "Das Ende des Sammelzeitraums muss in der Zukunft liegen.",
        requestPayload: formData,
      };

    /**
     * Create
     */
    const created = await prisma.profitDistributionCycle.create({
      data: {
        title: data.title,
        collectionEndsAt,
        createdById: authentication.session.entity.id,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.PROFIT_CYCLE_CREATED,
        data: {
          cycleId: created.id,
          title: created.title,
          // The system log is immutable, thus the old key keeps the planned end
          collectionEndedAt: created.collectionEndsAt,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/sincome");
    redirect(`/app/sincome/${created.id}`);
  },
);
