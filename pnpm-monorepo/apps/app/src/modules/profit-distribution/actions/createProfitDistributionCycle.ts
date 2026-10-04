"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  getLocalDate,
  ORGANIZATION_TIMEZONE,
  toDateColumnValue,
} from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

const schema = z.object({
  title: z.string().trim().max(128),
  /** A date input ("YYYY-MM-DD") gives the midnight UTC of the day */
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
    const collectionEndsAt = data.collectionEndsAt;
    const today = toDateColumnValue(
      getLocalDate(new Date(), ORGANIZATION_TIMEZONE),
    );
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

    refresh();
    redirect(`/app/sincome/${created.id}`);
  },
);
